import { createPermission } from '@backstage/plugin-permission-common';

export * from './types';

// Annotation utilities
export const DEFAULT_ANNOTATION_PREFIX = 'terasky.backstage.io';

export const getKroAnnotation = (
  annotations: Record<string, string> | undefined,
  prefix: string,
  key: string,
): string | undefined =>
  annotations?.[`${prefix}/${key}`] ||
  (prefix !== DEFAULT_ANNOTATION_PREFIX
    ? annotations?.[`${DEFAULT_ANNOTATION_PREFIX}/${key}`]
    : undefined);

export const hasKroResourceAnnotation = (
  annotations: Record<string, string> | undefined,
  annotationPrefix: string = DEFAULT_ANNOTATION_PREFIX,
): boolean => {
  if (!annotations) return false;
  // Fast path: check the requested prefix first
  if (annotations[`${annotationPrefix}/kro-rgd-id`]) return true;
  // When called with the default prefix (e.g. from entity blueprint filters that have no
  // access to app config), also scan every annotation key so that a custom annotationPrefix
  // configured in kubernetesIngestor is still recognised.
  if (annotationPrefix === DEFAULT_ANNOTATION_PREFIX) {
    return Object.keys(annotations).some(key => key.endsWith('/kro-rgd-id'));
  }
  // When called with a custom prefix, fall back to the default as well
  return Boolean(annotations[`${DEFAULT_ANNOTATION_PREFIX}/kro-rgd-id`]);
};

export const listInstancesPermission = createPermission({
  name: 'kro.instances.list',
  attributes: { action: 'read' },
});

export const viewYamlInstancesPermission = createPermission({
  name: 'kro.instances.view-yaml',
  attributes: { action: 'read' },
});

export const showEventsInstancesPermission = createPermission({
  name: 'kro.instances.show-events',
  attributes: { action: 'read' },
});

export const listRGDsPermission = createPermission({
  name: 'kro.rgds.list',
  attributes: { action: 'read' },
});

export const viewYamlRGDsPermission = createPermission({
  name: 'kro.rgds.view-yaml',
  attributes: { action: 'read' },
});

export const showEventsRGDsPermission = createPermission({
  name: 'kro.rgds.show-events',
  attributes: { action: 'read' },
});

export const listResourcesPermission = createPermission({
  name: 'kro.resources.list',
  attributes: { action: 'read' },
});

export const viewYamlResourcesPermission = createPermission({
  name: 'kro.resources.view-yaml',
  attributes: { action: 'read' },
});

export const showEventsResourcesPermission = createPermission({
  name: 'kro.resources.show-events',
  attributes: { action: 'read' },
});

export const showResourceGraph = createPermission({
  name: 'kro.resource-graph.show',
  attributes: { action: 'read' },
});

export const showOverview = createPermission({
  name: 'kro.overview.view',
  attributes: { action: 'read' },
});

export const kroPermissions = [showOverview, showEventsResourcesPermission, viewYamlResourcesPermission, listResourcesPermission, showResourceGraph, showEventsRGDsPermission, viewYamlRGDsPermission, listRGDsPermission, showEventsInstancesPermission, viewYamlInstancesPermission, listInstancesPermission];