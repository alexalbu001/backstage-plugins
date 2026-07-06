import { Entity } from '@backstage/catalog-model';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { usePermission } from '@backstage/plugin-permission-react';
import { showOverview, showResourceGraph, listResourcesPermission } from '@terasky/backstage-plugin-kro-common';
import { hasKroResourceAnnotation, getAnnotationPrefix } from './annotationUtils';

export const isKroAvailable = (entity: Entity): boolean => {
  return hasKroResourceAnnotation(entity.metadata.annotations);
};

// Create wrapper components that handle the permission checks for content
export const IfKroOverviewAvailable = (props: { children: JSX.Element }) => {
  const config = useApi(configApiRef);
  const enablePermissions = config.getOptionalBoolean('kro.enablePermissions') ?? false;
  const { allowed } = usePermission({ permission: showOverview });
  
  return allowed || !enablePermissions ? props.children : null;
};

export const IfKroResourceGraphAvailable = (props: { children: JSX.Element }) => {
  const config = useApi(configApiRef);
  const enablePermissions = config.getOptionalBoolean('kro.enablePermissions') ?? false;
  const { allowed } = usePermission({ permission: showResourceGraph });
  
  return allowed || !enablePermissions ? props.children : null;
};

export const IfKroResourcesListAvailable = (props: { children: JSX.Element }) => {
  const config = useApi(configApiRef);
  const enablePermissions = config.getOptionalBoolean('kro.enablePermissions') ?? false;
  const { allowed } = usePermission({ permission: listResourcesPermission });
  
  return allowed || !enablePermissions ? props.children : null;
};

// Create components that provide the condition functions for EntityLayout.Route
export const useKroResourceGraphAvailable = () => {
  const config = useApi(configApiRef);
  const annotationPrefix = getAnnotationPrefix(config);
  const enablePermissions = config.getOptionalBoolean('kro.enablePermissions') ?? false;
  const { allowed } = usePermission({ permission: showResourceGraph });
  
  return (entity: Entity) => hasKroResourceAnnotation(entity.metadata.annotations, annotationPrefix) && (!enablePermissions || allowed);
};

export const useKroResourceListAvailable = () => {
  const config = useApi(configApiRef);
  const annotationPrefix = getAnnotationPrefix(config);
  const enablePermissions = config.getOptionalBoolean('kro.enablePermissions') ?? false;
  const { allowed } = usePermission({ permission: listResourcesPermission });
  
  return (entity: Entity) => hasKroResourceAnnotation(entity.metadata.annotations, annotationPrefix) && (!enablePermissions || allowed);
};
