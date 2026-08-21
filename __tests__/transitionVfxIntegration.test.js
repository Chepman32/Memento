const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const previewPath = path.join(root, 'src', 'screens', 'PreviewScreen.tsx');
const vfxCanvasPath = path.join(
  root,
  'src',
  'components',
  'preview',
  'TransitionVfxCanvas.tsx',
);
const encoderPath = path.join(root, 'src', 'utils', 'videoEncoder.ts');
const imageGeometryPath = path.join(
  root,
  'src',
  'utils',
  'previewImageGeometry.ts',
);

describe('creative transition renderer integration', () => {
  it('routes creative transitions through a two-image Skia shader canvas', () => {
    const previewSource = fs.readFileSync(previewPath, 'utf8');

    expect(fs.existsSync(vfxCanvasPath)).toBe(true);
    const vfxSource = fs.existsSync(vfxCanvasPath)
      ? fs.readFileSync(vfxCanvasPath, 'utf8')
      : '';

    expect(previewSource).toContain('import { TransitionVfxCanvas }');
    expect(previewSource).toContain('<TransitionVfxCanvas');
    expect(previewSource).toContain('isTransitionVfx(currentTransitionType)');
    expect(vfxSource).toContain('Skia.RuntimeEffect.Make');
    expect(vfxSource).toContain('<Shader');
    expect(vfxSource.match(/<ImageShader/g)).toHaveLength(2);
  });

  it('shares preloaded images across stable photo and VFX surfaces', () => {
    const previewSource = fs.readFileSync(previewPath, 'utf8');
    const vfxSource = fs.readFileSync(vfxCanvasPath, 'utf8');

    expect(previewSource).toContain('onImageLoaded={handleImageLoaded}');
    expect(previewSource).toContain('outgoingImage=');
    expect(previewSource).toContain('incomingImage=');
    expect(previewSource).not.toMatch(/key={`photo-\$\{/);
    expect(vfxSource).not.toContain('useImage');
  });

  it('retains the completed VFX layer across the final compositor handoff', () => {
    const previewSource = fs.readFileSync(previewPath, 'utf8');

    expect(previewSource).toContain('VFX_HANDOFF_FRAME_COUNT = 2');
    expect(previewSource).toContain('retainedFrameRef.current');
    expect(previewSource).toContain('requestAnimationFrame(releaseFrame)');
  });

  it('uses identical image geometry and sampling on both sides of the handoff', () => {
    const previewSource = fs.readFileSync(previewPath, 'utf8');
    const vfxSource = fs.readFileSync(vfxCanvasPath, 'utf8');

    expect(fs.existsSync(imageGeometryPath)).toBe(true);
    expect(previewSource).toContain('getContainedImageRect');
    expect(vfxSource).toContain('getContainedImageRect');
    expect(previewSource).toContain('PREVIEW_IMAGE_SAMPLING');
    expect(vfxSource).toContain('PREVIEW_IMAGE_SAMPLING');
    expect(previewSource).toContain('sampling={PREVIEW_IMAGE_SAMPLING}');
    expect(vfxSource.match(/sampling=\{PREVIEW_IMAGE_SAMPLING\}/g)).toHaveLength(
      2,
    );
    expect(previewSource).toContain('fit="fill"');
    expect(vfxSource.match(/fit="fill"/g)).toHaveLength(2);
    expect(vfxSource).not.toMatch(/<ImageShader[\s\S]*?x=\{0\}/);
  });

  it('mounts every render surface inside one explicitly positioned viewport', () => {
    const previewSource = fs.readFileSync(previewPath, 'utf8');

    expect(previewSource).toContain(
      '<View style={styles.previewViewport} collapsable={false}>',
    );
    expect(previewSource).toMatch(
      /previewViewport:\s*\{\s*width: PREVIEW_WIDTH,\s*height: PREVIEW_HEIGHT,/,
    );
    expect(previewSource).toMatch(
      /photoLayer:\s*\{\s*\.\.\.StyleSheet\.absoluteFillObject,/,
    );
    expect(previewSource).toMatch(
      /<View\s+pointerEvents="none"\s+style=\{styles\.photoLayer\}\s+collapsable=\{false\}/,
    );
    expect(previewSource).toContain('vfxCaptionLayer');
  });

  it('returns unmodified textures at both shader endpoints', () => {
    const vfxSource = fs.readFileSync(vfxCanvasPath, 'utf8');

    expect(vfxSource).toContain('if (p <= 0.001)');
    expect(vfxSource).toContain('if (p >= 0.999)');
    expect(vfxSource).toContain('return opaqueFrame(incoming.eval(xy));');
  });

  it('updates React only at timeline boundaries while shader progress stays native', () => {
    const previewSource = fs.readFileSync(previewPath, 'utf8');
    const vfxSource = fs.readFileSync(vfxCanvasPath, 'utf8');

    expect(previewSource).toContain('shouldCommitPlaybackBoundary');
    expect(previewSource).toContain('vfxProgress.value =');
    expect(previewSource).not.toContain('setPlaybackPositionMs(nextPosition);');
    expect(vfxSource).toContain('useDerivedValue');
    expect(vfxSource).toContain('SharedValue<number>');
  });

  it('keeps the expensive blur and push shaders within their texture budgets', () => {
    const vfxSource = fs.readFileSync(vfxCanvasPath, 'utf8');

    expect(vfxSource).toContain('BLUR_TEXTURE_SAMPLE_BUDGET = 6');
    expect(vfxSource).toContain('PUSH_TEXTURE_SAMPLE_BUDGET = 4');
    expect(vfxSource).not.toContain('blurVector * 0.5');
    expect(vfxSource).not.toContain('trailAmount * 2.0');
  });

  it('keeps the four exported effects visually distinct', () => {
    const encoderSource = fs.readFileSync(encoderPath, 'utf8');

    expect(encoderSource).toContain("[TransitionType.DISSOLVE]: 'dissolve'");
    expect(encoderSource).toContain("[TransitionType.BLUR]: 'hblur'");
    expect(encoderSource).toContain(
      "[TransitionType.WIPE_CIRCLE]: 'circleopen'",
    );
    expect(encoderSource).toContain("[TransitionType.PUSH]: 'smoothleft'");
  });
});
