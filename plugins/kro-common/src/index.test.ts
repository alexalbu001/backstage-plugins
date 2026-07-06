import {
  listInstancesPermission,
  listRGDsPermission,
  listResourcesPermission,
  showResourceGraph,
  showOverview,
  kroPermissions,
  DEFAULT_ANNOTATION_PREFIX,
  getKroAnnotation,
  hasKroResourceAnnotation,
} from './index';

describe('kro-common', () => {
  describe('annotation utilities', () => {
    it('should export DEFAULT_ANNOTATION_PREFIX', () => {
      expect(DEFAULT_ANNOTATION_PREFIX).toBe('terasky.backstage.io');
    });

    describe('getKroAnnotation', () => {
      it('should return annotation value when present with default prefix', () => {
        const annotations = { 'terasky.backstage.io/kro-rgd-name': 'my-rgd' };
        expect(getKroAnnotation(annotations, 'terasky.backstage.io', 'kro-rgd-name')).toBe('my-rgd');
      });

      it('should return undefined when annotations is undefined', () => {
        expect(getKroAnnotation(undefined, 'terasky.backstage.io', 'kro-rgd-name')).toBeUndefined();
      });

      it('should fallback to DEFAULT_ANNOTATION_PREFIX when custom prefix annotation not found', () => {
        const annotations = { 'terasky.backstage.io/kro-rgd-name': 'my-rgd' };
        expect(getKroAnnotation(annotations, 'custom.prefix', 'kro-rgd-name')).toBe('my-rgd');
      });

      it('should return undefined when neither custom nor default prefix annotation exists', () => {
        const annotations = { 'other.prefix/kro-rgd-name': 'my-rgd' };
        expect(getKroAnnotation(annotations, 'custom.prefix', 'kro-rgd-name')).toBeUndefined();
      });
    });

    describe('hasKroResourceAnnotation', () => {
      it('should return true when kro-rgd-id annotation exists with default prefix', () => {
        const annotations = { 'terasky.backstage.io/kro-rgd-id': 'rgd-123' };
        expect(hasKroResourceAnnotation(annotations)).toBe(true);
      });

      it('should return false when annotations is undefined', () => {
        expect(hasKroResourceAnnotation(undefined)).toBe(false);
      });

      it('should return false for empty annotations', () => {
        expect(hasKroResourceAnnotation({})).toBe(false);
      });

      it('should detect custom annotationPrefix when called with DEFAULT_ANNOTATION_PREFIX (blueprint filter case)', () => {
        const annotations = { 'spectrocloud.backstage.io/kro-rgd-id': 'rgd-123' };
        expect(hasKroResourceAnnotation(annotations)).toBe(true);
        expect(hasKroResourceAnnotation(annotations, DEFAULT_ANNOTATION_PREFIX)).toBe(true);
      });

      it('should fallback to DEFAULT_ANNOTATION_PREFIX when custom prefix annotation not found', () => {
        const annotations = { 'terasky.backstage.io/kro-rgd-id': 'rgd-123' };
        expect(hasKroResourceAnnotation(annotations, 'custom.prefix')).toBe(true);
      });

      it('should return false when neither custom nor default prefix annotation exists', () => {
        const annotations = { 'other.prefix/kro-rgd-id': 'rgd-123' };
        expect(hasKroResourceAnnotation(annotations, 'custom.prefix')).toBe(false);
      });

      it('should return true when custom prefix annotation exists', () => {
        const annotations = { 'spectrocloud.backstage.io/kro-rgd-id': 'rgd-123' };
        expect(hasKroResourceAnnotation(annotations, 'spectrocloud.backstage.io')).toBe(true);
      });
    });
  });

  describe('permissions', () => {
    it('should export all permissions', () => {
      expect(listInstancesPermission).toBeDefined();
      expect(listRGDsPermission).toBeDefined();
      expect(listResourcesPermission).toBeDefined();
      expect(showResourceGraph).toBeDefined();
      expect(showOverview).toBeDefined();
    });

    it('should export kroPermissions array', () => {
      expect(kroPermissions).toBeDefined();
      expect(Array.isArray(kroPermissions)).toBe(true);
      expect(kroPermissions.length).toBeGreaterThan(0);
    });
  });
});

