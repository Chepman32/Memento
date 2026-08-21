const fs = require('fs');
const path = require('path');

const editorSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'screens', 'EditorScreen.tsx'),
  'utf8',
);

describe('editor voice input header icon', () => {
  it('uses the combined text and microphone artwork', () => {
    expect(editorSource).toContain("from 'react-native-svg'");
    expect(editorSource).toContain('const EditorVoiceIcon:');
    expect(editorSource).toContain(
      'icon={<EditorVoiceIcon color={colors.text} />}',
    );
    expect(editorSource).not.toContain(
      'icon={<FeatherIcon name="mic" size={22} color={colors.text} />}',
    );
  });
});
