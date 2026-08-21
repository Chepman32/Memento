const fs = require('fs');
const path = require('path');

const modalSource = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    'src',
    'components',
    'editor',
    'VoiceInputModal.tsx',
  ),
  'utf8',
);

describe('voice input microphone handler', () => {
  it('does not pass the press event as a permission override', () => {
    expect(modalSource).toContain(
      'onPress={isRecording ? handleStopRecording : () => handleStartRecording()}',
    );
  });
});
