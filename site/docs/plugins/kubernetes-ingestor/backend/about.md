# Kubernetes Ingestor Backend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kubernetes-ingestor/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kubernetes-ingestor) ![NPM Downloads](https://img.shields.io/npm/dy/@terasky/backstage-plugin-kubernetes-ingestor)

## Overview

The Kubernetes Ingestor backend plugin is a catalog entity provider that automatically creates and maintains Backstage catalog entities from Kubernetes resources. It supports standard workloads, custom resources, and provides deep integration with Crossplane for managing cloud infrastructure.

## Features

### Resource Discovery
- Automatic workload detection
- Custom resource type support
- Namespace filtering
- Selective ingestion
- Multi-cluster support

### Crossplane Integration
- Claim resource ingestion (v1)
- XR resource ingestion (v2)
- XRD template generation
- API entity creation
- Relationship tracking

### Template Generation
- XRD-based templates
- Multiple publishing targets
- Git integration
- YAML download option
- Customizable outputs

### Entity Management
- Delta-based periodic sync — every scheduled run applies only diffs, never a full replacement
- Event-driven incremental mutations for real-time catalog updates
- CacheService-backed state survives restarts and is shared across replicas
- Orphan grace period prevents premature entity deletion when clusters are temporarily unavailable
- Relationship mapping
- System organization
- Metadata handling
- Annotation processing
- Flexible entity types (Component or Resource)
- API-only ingestion mode

## Components

### Entity Provider
The core component that:
- Discovers resources per cluster in parallel
- Creates entities
- Maintains relationships
- Updates catalog via delta mutations backed by the Backstage CacheService

### Template Generator
Generates software templates for:  
- Crossplane XRDs  
- Custom resources  
- Resource creation  
- Configuration management  
- YAML download links (base64-encoded for browser compatibility)  

### API Manager
Handles API-related tasks:  
- API entity creation (CRD-type or OpenAPI-type)
- Relationship tracking  
- Version management  
- Documentation links
- Schema extraction and processing

## Technical Details

### Resource Processing
The plugin processes resources through:
1. Discovery phase — `getClusters()` returns active clusters each run
2. Per-cluster parallel fetch — `fetchForCluster()` fetches and enriches resources for one cluster
3. Filtering phase — exclusion annotations, namespace exclusions, annotated-only mode
4. Entity creation and relationship mapping
5. Delta mutation — `added`/`removed` diff against `CacheService`-backed per-cluster entity-ref sets

### Delta/Incremental Mutations

#### Periodic delta sync
Every scheduled run uses `type: delta` mutations exclusively — the catalog is never atomically replaced. The plugin reads the previous entity-ref set for each cluster from the Backstage `CacheService`, computes the diff against the current run's entities, and applies only the changes. The cache persists across restarts and is shared across replicas when a shared cache backend (Redis/Memcached) is configured.

#### Orphan protection
Clusters that disappear from `getClusters()` accumulate a miss counter in the cache. Their entities are only removed from the catalog after `orphanProtection.gracePeriodRuns` consecutive absences (default: 3). This prevents spurious deletions when a dynamic cluster provider takes time to register all clusters on startup or during rolling restarts.

#### Event-driven delta updates
The entity provider also supports real-time incremental updates via the `deltaUpdate` method, allowing individual resources to be added, updated, or removed from the catalog without waiting for the next scheduled cycle. This is useful for event-driven architectures where a Kubernetes controller or webhook can push change events to the plugin.

Key behaviors:
- **Upserts**: The resource is fetched from the cluster and translated into catalog entities, which are then added or updated via a delta mutation.
- **Deletes**: When a resource is deleted, only the resource-specific entities (Component/Resource, API) are removed. Shared System entities are preserved to avoid affecting other resources in the same namespace/system.
- **Explicit entity names**: Delete events can include an `entityNames` array with exact entity refs (e.g., `"Component:default/my-app"`) to avoid mismatches when annotation-based naming was used.
- **Prerequisite**: Event-driven delta updates require the initial periodic sync to have completed so that internal caches (CRD mappings, Crossplane lookups, KRO lookups) are populated.

### Mapping Models
Supports various mapping models:  
- Namespace mapping  
- Name mapping  
- Title mapping  
- System mapping  
- Reference mapping  

### Task Runners
Configurable task runners for:  
- Resource discovery  
- Template generation  
- API updates  
- Relationship maintenance  

## Integration Points

### Kubernetes Integration
- Cluster access
- Resource watching
- Event handling
- State management

### Crossplane Integration
- XRD processing
- Claim handling
- API generation
- Template creation

### Git Integration
- Repository access
- PR creation
- Branch management
- File handling

## Use Cases

### Standard Workload Management
1. Discover workloads
2. Create components
3. Map relationships
4. Maintain metadata

### Crossplane Resource Management
1. Process XRDs
2. Generate templates
3. Create API entities
4. Track relationships

### Custom Resource Management
1. Define custom types
2. Configure ingestion
3. Process resources
4. Create entities

## Example Workflows

### Workload Discovery
```yaml
kubernetesIngestor:
  components:
    enabled: true
    taskRunner:
      frequency: 10
      timeout: 600
    excludedNamespaces:
      - kube-system
    customWorkloadTypes:
      - group: pkg.crossplane.io
        apiVersion: v1
        plural: providers
```

### Template Generation
```yaml
kubernetesIngestor:
  crossplane:
    xrds:
      publishPhase:
        allowedTargets: ['github.com', 'gitlab.com']
        target: github
        git:
          repoUrl: github.com?owner=org&repo=templates
          targetBranch: main
        allowRepoSelection: true
```

### Download Link Encoding

Generated templates include "Download YAML Manifest" links that use **base64 encoding** (e.g., `data:application/yaml;base64,...`). This encoding format:
- Ensures reliable downloads across all browsers
- Follows W3C standards for data URIs
- Preserves YAML formatting and newlines
- Provides smaller file sizes compared to URL encoding

For installation and configuration details, refer to the [Installation Guide](./install.md) and [Configuration Guide](./configure.md).
