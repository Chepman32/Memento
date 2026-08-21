export const buildExportOutputPath = (
  directory: string,
  filename: string,
): string => {
  const nativeDirectory = directory
    .replace(/^file:\/\//, '')
    .replace(/\/+$/, '');
  const safeFilename = filename.replace(/^\/+/, '');

  return `${nativeDirectory}/${safeFilename}`;
};
