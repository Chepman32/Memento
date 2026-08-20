const en = require('../src/i18n/locales/en.json');
const ru = require('../src/i18n/locales/ru.json');

const flatten = (value, prefix = '', result = {}) => {
  Object.entries(value).forEach(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object') {
      flatten(child, path, result);
    } else {
      result[path] = child;
    }
  });
  return result;
};

const placeholders = value =>
  [...value.matchAll(/{{\s*([^}\s]+)\s*}}/g)].map(match => match[1]).sort();

describe('Russian localization', () => {
  const flatEnglish = flatten(en);
  const flatRussian = flatten(ru);

  it('has every English localization key', () => {
    expect(Object.keys(flatRussian).sort()).toEqual(
      Object.keys(flatEnglish).sort(),
    );
  });

  it('preserves every interpolation variable', () => {
    Object.entries(flatEnglish).forEach(([key, englishValue]) => {
      expect(placeholders(flatRussian[key])).toEqual(
        placeholders(englishValue),
      );
    });
  });

  it('uses natural, contextual copy in onboarding', () => {
    expect(ru.onboarding.slides.hook.body).toBe(
      'Начните с самого выразительного фото. Затем переходите от общих планов к деталям — так история будет понятнее.',
    );
    expect(ru.onboarding.slides.rhythm.body).toBe(
      'Обычно на одно фото достаточно 2–3 секунд. Важные моменты можно показать подольше.',
    );
    expect(ru.onboarding.slides.transitions.body).toBe(
      'Выберите один переход и используйте его в меру. Чем проще, тем лучше.',
    );
    expect(ru.onboarding.slides.export.body).toBe(
      'Для сторис подойдёт 9:16, для телевизора — 16:9. Сохраните готовый результат в высоком качестве.',
    );
  });

  it('uses concise copy for common editing and export actions', () => {
    expect(ru.home.emptyStateTitle).toBe('Пока нет проектов');
    expect(ru.editor.duration).toBe('Время показа');
    expect(ru.editor.voiceInput.title).toBe('Голосовой ввод');
    expect(ru.export.title).toBe('Экспорт');
    expect(ru.export.exportNow).toBe('Начать экспорт');
    expect(ru.settings.hapticFeedback).toBe('Виброотклик');
    expect(ru.premium.subscribe).toBe('Оформить подписку');
  });

  it('does not contain known literal translation artifacts', () => {
    const copy = Object.values(flatRussian).join('\n');
    [
      'Откройте самой сильной фотографией',
      'при 2-3 секундах',
      'Тонкое побеждает загруженное',
      'высококачественный мастер',
      'Экспорт вашего воспоминания',
      'Чистые профессиональные экспорты',
      'тактильная обратная связь',
    ].forEach(artifact => {
      expect(copy).not.toContain(artifact);
    });
  });
});
