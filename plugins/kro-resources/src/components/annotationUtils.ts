import { ConfigApi } from '@backstage/core-plugin-api';
import {
  DEFAULT_ANNOTATION_PREFIX,
  getKroAnnotation,
  hasKroResourceAnnotation,
} from '@terasky/backstage-plugin-kro-common';

export const getAnnotationPrefix = (config: ConfigApi): string =>
  config.getOptionalString('kubernetesIngestor.annotationPrefix') ||
  DEFAULT_ANNOTATION_PREFIX;

// Re-export from common for convenience
export { getKroAnnotation, hasKroResourceAnnotation, DEFAULT_ANNOTATION_PREFIX };
