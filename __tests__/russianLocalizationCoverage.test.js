const fs = require('fs');
const path = require('path');
const ru = require('../src/i18n/locales/ru.json');
const {
  formatProjectDate,
  resolveSpeechLocale,
} = require('../src/utils/localization');

const readSource = relativePath =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('complete Russian localization coverage', () => {
  it('formats project dates with the active language', () => {
    const date = new Date('2026-08-21T12:00:00.000Z');

    expect(formatProjectDate(date, 'ru')).toMatch(/^21\s+авг\./i);
    expect(formatProjectDate(date, 'en')).toMatch(/^Aug\s+21$/i);

    const homeSource = readSource('src/screens/HomeScreen.tsx');
    expect(homeSource).toContain(
      'formatProjectDate(\n        item.updatedAt,\n        i18n.resolvedLanguage || i18n.language,\n      )',
    );
    expect(homeSource).not.toContain("'en-US'");
  });

  it('localizes every remaining reusable UI status and error state', () => {
    expect(ru.editor.saveFailed).toBe('Не удалось сохранить');
    expect(ru.webView.loadFailed).toBe('Не удалось загрузить страницу');
    expect(ru.webView.retry).toBe('Попробовать снова');

    const saveIndicator = readSource(
      'src/components/editor/SaveIndicator.tsx',
    );
    expect(saveIndicator).toContain("t('editor.saveFailed')");
    expect(saveIndicator).not.toContain("text: 'Save failed'");

    const webView = readSource('src/screens/WebViewScreen.tsx');
    expect(webView).toContain("t('webView.loadFailed')");
    expect(webView).toContain("t('webView.loadErrorMessage')");
    expect(webView).toContain("t('webView.retry')");
    expect(webView).not.toContain('Failed to Load');
    expect(webView).not.toContain('Unable to load the content.');
  });

  it('localizes effect names and slider values in the editor', () => {
    expect(ru.editor.captions.fontSizeValue).toBe('{{value}} пикс.');

    const editor = readSource('src/screens/EditorScreen.tsx');
    expect(editor).toContain("const effectName = t(`effects.${effect}`)");
    expect(editor).toContain(
      "formatValue={sliderValue =>\n                    t('editor.durationValue', { value: sliderValue })",
    );
    expect(editor).toContain(
      "formatValue={sliderValue =>\n                      t('editor.captions.fontSizeValue', { value: sliderValue })",
    );
    expect(editor).not.toContain("name: 'Ken Burns'");
    expect(editor).not.toContain('{value}s');
  });

  it('localizes generated project labels and archive display names', () => {
    expect(ru.home.archived).toBe('Архив');
    expect(ru.home.copySuffix).toBe(' — копия');

    const home = readSource('src/screens/HomeScreen.tsx');
    expect(home).toContain("duplicateProject(projectId, t('home.copySuffix'))");
    expect(home).toMatch(
      /folder\.name === 'Archived'\s*\? t\('home\.archived'\)\s*:\s*folder\.name/,
    );
  });

  it('shows language names in Russian instead of hard-coded English', () => {
    const languageCodes = [
      'en',
      'zh',
      'ja',
      'ko',
      'de',
      'fr',
      'es',
      'pt',
      'ar',
      'ru',
      'it',
      'nl',
      'tr',
      'th',
      'vi',
      'id',
      'pl',
      'uk',
      'hi',
      'he',
      'sv',
      'no',
      'da',
      'fi',
      'cs',
      'hu',
      'ro',
      'el',
      'ms',
      'fil',
    ];

    expect(Object.keys(ru.settings.languageNames).sort()).toEqual(
      languageCodes.sort(),
    );
    expect(ru.settings.languageNames.en).toBe('Английский');
    expect(ru.settings.languageNames.ru).toBe('Русский');

    const settings = readSource('src/screens/SettingsScreen.tsx');
    expect(settings).toContain(
      't(`settings.languageNames.${currentLanguage.code}`)',
    );
    expect(settings).toContain('t(`settings.languageNames.${language.code}`)');
    expect(settings).not.toContain('{currentLanguage.name}');
    expect(settings).not.toContain('{language.name}');
  });

  it('does not surface internal English export errors to the user', () => {
    const exportScreen = readSource('src/screens/ExportScreen.tsx');

    expect(exportScreen).toContain("t('errors.videoEncodeFailed')");
    expect(exportScreen).toContain("t('errors.gifCreateFailed')");
    expect(exportScreen).not.toContain(
      'error instanceof Error ? error.message : t(\'errors.generic\')',
    );
  });

  it('uses the selected Russian language for speech recognition and errors', () => {
    expect(resolveSpeechLocale('ru')).toBe('ru-RU');
    expect(resolveSpeechLocale('ru-RU')).toBe('ru-RU');
    expect(resolveSpeechLocale('en')).toBe('en-US');

    const voiceInput = readSource(
      'src/components/editor/VoiceInputModal.tsx',
    );
    expect(voiceInput).toContain(
      'resolveSpeechLocale(i18n.resolvedLanguage || i18n.language)',
    );
    expect(voiceInput).not.toContain('setError(errorMsg)');
    expect(voiceInput).not.toContain(
      'setError(err instanceof Error ? err.message',
    );
  });
});
