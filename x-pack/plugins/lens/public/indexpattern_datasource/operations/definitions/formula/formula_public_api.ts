/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { convertDataViewIntoLensIndexPattern } from '../../../../indexpattern_service/loader';
import type { IndexPattern } from '../../../../types';
import type { PersistedIndexPatternLayer } from '../../../types';

import { insertOrReplaceFormulaColumn } from './parse';

/** @public **/
export interface FormulaPublicApi {
  /**
   * Method which Lens consumer can import and given a formula string,
   * return a parsed result as list of columns to use as Embeddable attributes.
   *
   * @param id - Formula column id
   * @param column.formula - String representation of a formula
   * @param [column.label] - Custom formula label
   * @param layer - The layer to which the formula columns will be added
   * @param dataView - The dataView instance
   *
   * See `x-pack/examples/embedded_lens_example` for exemplary usage.
   */
  insertOrReplaceFormulaColumn: (
    id: string,
    column: {
      formula: string;
      label?: string;
      format?: {
        id: string;
        params?: {
          decimals: number;
        };
      };
    },
    layer: PersistedIndexPatternLayer,
    dataView: DataView
  ) => PersistedIndexPatternLayer | undefined;
}

/** @public **/
export const createFormulaPublicApi = (): FormulaPublicApi => {
  const cache: WeakMap<DataView, IndexPattern> = new WeakMap();

  const getCachedLensIndexPattern = (dataView: DataView): IndexPattern => {
    const cachedIndexPattern = cache.get(dataView);
    if (cachedIndexPattern) {
      return cachedIndexPattern;
    }
    const indexPattern = convertDataViewIntoLensIndexPattern(dataView);
    cache.set(dataView, indexPattern);
    return indexPattern;
  };

  return {
    insertOrReplaceFormulaColumn: (id, { formula, label, format }, layer, dataView) => {
      const indexPattern = getCachedLensIndexPattern(dataView);

      return insertOrReplaceFormulaColumn(
        id,
        {
          label: label ?? formula,
          customLabel: Boolean(label),
          operationType: 'formula',
          dataType: 'number',
          references: [],
          isBucketed: false,
          params: {
            formula,
            format,
          },
        },
        { ...layer, indexPatternId: indexPattern.id },
        { indexPattern }
      ).layer;
    },
  };
};
