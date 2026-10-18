import { describe, expect, it } from 'vitest';
import * as ui from './index';

describe('@mentorhub/ui public API', () => {
  it('exposes primitives and the backend panel layer', () => {
    for (const name of [
      'cn',
      'Button',
      'Card',
      'Badge',
      'Table',
      'apiCall',
      'apiCallOrThrow',
      'ApiCallError',
      'readJsonSafe',
      'REQUEST_HEADER',
      'CrudForm',
      'validateWithSchema',
      'DataTable',
      'paginate',
      'LoadingMessage',
      'ErrorMessage',
      'EmptyState',
      'SessionMenu',
    ]) {
      expect(ui, name).toHaveProperty(name);
    }
  });
});
