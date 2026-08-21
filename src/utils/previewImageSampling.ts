import {
  FilterMode,
  MipmapMode,
  type SamplingOptions,
} from '@shopify/react-native-skia';

export const PREVIEW_IMAGE_SAMPLING: SamplingOptions = {
  filter: FilterMode.Linear,
  mipmap: MipmapMode.None,
};
