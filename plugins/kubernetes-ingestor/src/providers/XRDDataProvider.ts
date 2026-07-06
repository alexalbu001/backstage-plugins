import { Config } from '@backstage/config';
import { LoggerService } from '@backstage/backend-plugin-api';
import { DefaultKubernetesResourceFetcher } from '../services';

export class XRDDataProvider {
  constructor(
    private readonly resourceFetcher: DefaultKubernetesResourceFetcher,
    private readonly config: Config,
    private readonly logger: LoggerService,
  ) {}

  private getAnnotationPrefix(): string {
    return this.config.getOptionalString('kubernetesIngestor.annotationPrefix') || 'terasky.backstage.io';
  }

  async fetchXRDObjects(): Promise<any[]> {
    try {
      // Get allowed clusters from config or discover them
      const allowedClusters = this.config.getOptionalStringArray('kubernetesIngestor.allowedClusterNames');
      let clusters: string[] = [];
      
      if (allowedClusters) {
        clusters = allowedClusters;
      } else {
        try {
          clusters = await this.resourceFetcher.getClusters();
        } catch (error) {
          this.logger.error('Failed to discover clusters:', error instanceof Error ? error : { error: String(error) });
          return [];
        }
      }

      if (clusters.length === 0) {
        this.logger.warn('No clusters found.');
        return [];
      }

      const ingestAllXRDs = this.config.getOptionalBoolean('kubernetesIngestor.crossplane.xrds.ingestAllXRDs') ?? false;
      // Collect XRDs and compositions from all clusters first, then build the xrdMap once.
      // Previously, xrdMap processing ran inside the cluster loop after concatenating to a
      // shared allFetchedObjects array, causing O(n²) reprocessing of all prior clusters'
      // XRDs on each iteration.
      const allFetchedObjects: any[] = [];
      const allFetchedCompositions: any[] = [];
      const xrdMap = new Map<string, any>();

      for (const clusterName of clusters) {
        try {
          // Fetch all XRDs with version tracking
          let v1XRDs: any[] = [];
          let v2XRDs: any[] = [];
          let v1Available = false;
          let v2Available = false;

          try {
            v1XRDs = await this.resourceFetcher.fetchResources({
              clusterName,
              resourcePath: 'apiextensions.crossplane.io/v1/compositeresourcedefinitions',
            }) || [];
            v1Available = true;
            this.logger.info(`Cluster ${clusterName} has Crossplane v1 API available`);
          } catch (error: any) {
            if (error?.message?.includes('403') || error?.message?.includes('Forbidden')) {
              this.logger.warn(`Cluster ${clusterName}: permission denied accessing Crossplane v1 API. Verify the service account has read access to apiextensions.crossplane.io resources.`);
            } else {
              this.logger.info(`Cluster ${clusterName} does not have Crossplane v1 API available`);
            }
          }

          try {
            v2XRDs = await this.resourceFetcher.fetchResources({
              clusterName,
              resourcePath: 'apiextensions.crossplane.io/v2/compositeresourcedefinitions',
            }) || [];
            v2Available = true;
            this.logger.info(`Cluster ${clusterName} has Crossplane v2 API available`);
          } catch (error: any) {
            if (error?.message?.includes('403') || error?.message?.includes('Forbidden')) {
              this.logger.warn(`Cluster ${clusterName}: permission denied accessing Crossplane v2 API. Verify the service account has read access to apiextensions.crossplane.io resources.`);
            } else {
              this.logger.info(`Cluster ${clusterName} does not have Crossplane v2 API available`);
            }
          }

          if (!v1Available && !v2Available) {
            this.logger.warn(`Cluster ${clusterName} has no Crossplane APIs available, skipping XRD processing`);
            continue;
          }

          // Fetch all CRDs ONCE for this cluster
          const crdObjects = await this.resourceFetcher.fetchResources({
            clusterName,
            resourcePath: 'apiextensions.k8s.io/v1/customresourcedefinitions',
          }) || [];

          const crdMap = new Map(
            (Array.isArray(crdObjects) ? crdObjects : [])
              .map((crd: any) => [crd.metadata.name, crd])
          );

          const v1Items = Array.isArray(v1XRDs) ? v1XRDs : [];
          const v2Items = Array.isArray(v2XRDs) ? v2XRDs : [];
          
          const fetchedResources = [...v1Items, ...v2Items].map((resource: any) => {
            const isV2 = !!resource.spec?.scope;
            const crossplaneVersion = isV2 ? 'v2' : 'v1';
            const scope = resource.spec?.scope || (isV2 ? 'LegacyCluster' : 'Cluster');
            const generatedCRD = crdMap.get(resource.metadata.name);
            return {
              ...resource,
              clusterName,
              clusterEndpoint: clusterName,
              crossplaneVersion,
              scope,
              generatedCRD,
            };
          });

          const prefix = this.getAnnotationPrefix();
          const filteredObjects = fetchedResources
            .filter(resource => {
              if (resource.metadata.annotations?.[`${prefix}/exclude-from-catalog`]) {
                return false;
              }

              if (!ingestAllXRDs && !resource.metadata.annotations?.[`${prefix}/add-to-catalog`]) {
                return false;
              }

              const isV2 = resource.apiVersion === 'apiextensions.crossplane.io/v2';
              const scope = resource.spec?.scope || (isV2 ? 'Namespaced' : 'Cluster');
              const isLegacyCluster = isV2 && scope === 'LegacyCluster';

              if (!isV2 && !resource.spec?.claimNames?.kind) {
                return false;
              }
              if (isV2 && isLegacyCluster && !resource.spec?.claimNames?.kind) {
                return false;
              }
              return true;
            });

          allFetchedObjects.push(...filteredObjects);

          // Collect compositions; they are matched to XRDs after the loop
          const compositions = await this.resourceFetcher.fetchResources({
            clusterName,
            resourcePath: 'apiextensions.crossplane.io/v1/compositions',
          }) || [];

          const compositionItems = Array.isArray(compositions) ? compositions : [];
          allFetchedCompositions.push(
            ...compositionItems.map((resource: any) => ({
              ...resource,
              clusterName,
              clusterEndpoint: clusterName,
            })),
          );

        } catch (error) {
          this.logger.error(
            `Failed to fetch XRD objects for cluster ${clusterName}: ${error}`,
          );
        }
      }

      // Build xrdMap once from all collected XRDs
      for (const xrd of allFetchedObjects) {
        const xrdName = xrd.metadata.name;
        const compositeType = xrd.status?.controllers?.compositeResourceType;

        if (!compositeType || !compositeType.kind || !compositeType.apiVersion || compositeType.kind === '' || compositeType.apiVersion === '') {
          this.logger.error(
            `XRD ${xrdName} has invalid or missing compositeResourceType controllers status. Kind: ${compositeType?.kind}, ApiVersion: ${compositeType?.apiVersion}. Skipping created a Software Template for this XRD.`,
          );
          continue;
        }

        if (!xrdMap.has(xrdName)) {
          xrdMap.set(xrdName, {
            ...xrd,
            clusters: [xrd.clusterName],
            clusterDetails: [{ name: xrd.clusterName, url: xrd.clusterEndpoint }],
            compositions: [],
            generatedCRD: xrd.generatedCRD,
          });
        } else {
          const existingXrd = xrdMap.get(xrdName);
          if (!existingXrd.clusters.includes(xrd.clusterName)) {
            existingXrd.clusters.push(xrd.clusterName);
            existingXrd.clusterDetails.push({ name: xrd.clusterName, url: xrd.clusterEndpoint });
          }
        }
      }

      // Match compositions to XRDs once after all clusters are processed
      for (const composition of allFetchedCompositions) {
        const { apiVersion, kind } = composition.spec.compositeTypeRef;
        xrdMap.forEach(xrd => {
          const { apiVersion: xrdApiVersion, kind: xrdKind } = xrd.status.controllers.compositeResourceType;
          if (apiVersion === xrdApiVersion && kind === xrdKind) {
            if (!xrd.compositions.includes(composition.metadata.name)) {
              xrd.compositions.push(composition.metadata.name);
            }
          }
        });
      }

      return Array.from(xrdMap.values());
    } catch (error) {
      this.logger.error('Error fetching XRD objects:', error instanceof Error ? error : { error: String(error) });
      return [];
    }
  }

  async buildClaimKindLookup(): Promise<Set<string>> {
    try {
      const xrdObjects = await this.fetchXRDObjects();
      const claimKinds = new Set<string>();

      for (const xrd of xrdObjects) {
        const claimKind = xrd.spec?.claimNames?.kind;
        const group = xrd.spec?.group;
        if (claimKind && group) {
          claimKinds.add(`${group}|${claimKind}`);
          claimKinds.add(`${group}|${claimKind}`.toLowerCase());
        }
      }

      return claimKinds;
    } catch (error) {
      this.logger.error('Error building claim kind lookup:', error instanceof Error ? error : { error: String(error) });
      return new Set();
    }
  }

  async buildCompositeKindLookup(): Promise<{ [key: string]: any }> {
    try {
      const xrdObjects = await this.fetchXRDObjects();
      const lookup: { [key: string]: any } = {};

      for (const xrd of xrdObjects) {
        const isV2 = !!xrd.spec?.scope;
        const scope = xrd.spec?.scope || (isV2 ? 'LegacyCluster' : 'Cluster');
        if (isV2 && scope !== 'LegacyCluster') {
          const kind = xrd.spec?.names?.kind;
          const group = xrd.spec?.group;
          for (const version of xrd.spec.versions || []) {
            const versionName = version.name;
            const key = `${kind}|${group}|${versionName}`;
            lookup[key] = xrd;
            lookup[key.toLowerCase()] = xrd;
          }
        }
      }

      return lookup;
    } catch (error) {
      this.logger.error('Error building composite kind lookup:', error instanceof Error ? error : { error: String(error) });
      return {};
    }
  }
}