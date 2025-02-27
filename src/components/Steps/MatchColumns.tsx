import { Field, RawData } from '../../types';
import { useRsi } from '../../hooks/useRsi';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as React from 'react';
import { setColumn } from '../MatchColumns/setColumn';
import { toast } from 'react-toastify';
import { setSubColumn } from '../MatchColumns/setSubColumn';
import { findUnmatchedRequiredFields } from '../MatchColumns/findUnmatchedRequiredFields';
import { normalizeTableData } from '../MatchColumns/normalizeTableData';
import { getMatchedColumns } from '../MatchColumns/getMatchedColumns';
import { ColumnGrid } from '../ColumnGrid';
import { UserTableColumn } from '../UserTableColumn';
import { TemplateColumn } from '../TemplateColumn';
import { setIgnoreColumn } from '../MatchColumns/setIgnoreColumn';
import { Button, DialogActions } from '@mui/material';
import Box from '@mui/material/Box';
import Typography from "@mui/material/Typography";

export type MatchColumnsProps<T extends string> = {
  data: RawData[];
  headerValues: RawData;
  onContinue: (data: any[], rawData: RawData[], columns: Columns<T>) => void;
};

export enum ColumnType {
  empty,
  ignored,
  matched,
  matchedCheckbox,
  matchedSelect,
  matchedSelectOptions,
}

export type MatchedOptions<T> = {
  entry: string;
  value: T;
};

type EmptyColumn = { type: ColumnType.empty; index: number; header: string };
type IgnoredColumn = { type: ColumnType.ignored; index: number; header: string };
type MatchedColumn<T> = { type: ColumnType.matched; index: number; header: string; value: T };
type MatchedSwitchColumn<T> = { type: ColumnType.matchedCheckbox; index: number; header: string; value: T };
export type MatchedSelectColumn<T> = {
  type: ColumnType.matchedSelect;
  index: number;
  header: string;
  value: T;
  matchedOptions: Partial<MatchedOptions<T>>[];
};
export type MatchedSelectOptionsColumn<T> = {
  type: ColumnType.matchedSelectOptions;
  index: number;
  header: string;
  value: T;
  matchedOptions: MatchedOptions<T>[];
};

export type Column<T extends string> =
  | EmptyColumn
  | IgnoredColumn
  | MatchedColumn<T>
  | MatchedSwitchColumn<T>
  | MatchedSelectColumn<T>
  | MatchedSelectOptionsColumn<T>;

export type Columns<T extends string> = Column<T>[];

export const MatchColumnsStep = <T extends string>({ data, headerValues, onContinue }: MatchColumnsProps<T>) => {
  const dataExample = data.slice(0, 2);
  const { fields, autoMapHeaders, autoMapDistance, translations } = useRsi<T>();
  const [isLoading, setIsLoading] = useState(false);
  const [columns, setColumns] = useState<Columns<T>>(
    // Do not remove spread, it indexes empty array elements, otherwise map() skips over them
    ([...headerValues] as string[]).map((value, index) => ({ type: ColumnType.empty, index, header: value ?? '' })),
  );
  useEffect(() => {
    const matchedColumns = getMatchedColumns(columns, fields, data, 1);
    setColumns(matchedColumns);
  }, []);

  const [showUnmatchedFieldsAlert, setShowUnmatchedFieldsAlert] = useState(false);

  const onChange = useCallback(
    (value: T, columnIndex: number) => {
      const field = fields.find(field => field.key === value) as unknown as Field<T>;
      const existingFieldIndex = columns.findIndex(column => 'value' in column && column.value === field.key);
      setColumns(
        columns.map<Column<T>>((column, index) => {
          if (columnIndex === index) {
            return setColumn(column, field, data);
          } else if (index === existingFieldIndex) {
            toast(
              `${translations.matchColumnsStep.duplicateColumnWarningTitle}: ${translations.matchColumnsStep.duplicateColumnWarningDescription}`,
              {
                type: 'warning',
                position: 'bottom-left',
                closeOnClick: true,
              },
            );
            return setColumn(column);
          } else {
            return column;
          }
        }),
      );
    },
    [
      columns,
      data,
      fields,
      toast,
      translations.matchColumnsStep.duplicateColumnWarningDescription,
      translations.matchColumnsStep.duplicateColumnWarningTitle,
    ],
  );

  const onIgnore = useCallback(
    (columnIndex: number) => {
      setColumns(columns.map((column, index) => (columnIndex === index ? setIgnoreColumn<T>(column) : column)));
    },
    [columns, setColumns],
  );

  const onRevertIgnore = useCallback(
    (columnIndex: number) => {
      setColumns(columns.map((column, index) => (columnIndex === index ? setColumn(column) : column)));
    },
    [columns, setColumns],
  );

  const onSubChange = useCallback(
    (value: string, columnIndex: number, entry: string) => {
      setColumns(
        columns.map((column, index) =>
          columnIndex === index && 'matchedOptions' in column ? setSubColumn(column, entry, value) : column,
        ),
      );
    },
    [columns, setColumns],
  );
  const unmatchedRequiredFields = useMemo(() => findUnmatchedRequiredFields(fields, columns), [fields, columns]);

  const handleOnContinue = useCallback(async () => {
    if (unmatchedRequiredFields.length > 0) {
      setShowUnmatchedFieldsAlert(true);
      alert(translations.alerts.unmatchedRequiredFields.headerTitle);
    } else {
      setIsLoading(true);
      const normalizedData = normalizeTableData(columns, data, fields);
      onContinue(normalizedData, data, columns);
      setIsLoading(false);
    }
  }, [unmatchedRequiredFields.length, onContinue, columns, data, fields]);

  const handleAlertOnContinue = useCallback(async () => {
    setShowUnmatchedFieldsAlert(false);
    setIsLoading(true);
    onContinue(normalizeTableData(columns, data, fields), data, columns);
    setIsLoading(false);
  }, [onContinue, columns, data, fields]);

  return (
    <>
      {/*<UnmatchedFieldsAlert*/}
      {/*    isOpen={showUnmatchedFieldsAlert}*/}
      {/*    onClose={() => setShowUnmatchedFieldsAlert(false)}*/}
      {/*    fields={unmatchedRequiredFields}*/}
      {/*    onConfirm={handleAlertOnContinue}*/}
      {/*/>*/}
      <Typography variant={'h4'} gutterBottom>
        {translations.matchColumnsStep.title}
      </Typography>
      <ColumnGrid
        columns={columns}
        onContinue={handleOnContinue}
        isLoading={isLoading}
        userColumn={column => (
          <UserTableColumn
            column={column}
            onIgnore={onIgnore}
            onRevertIgnore={onRevertIgnore}
            entries={dataExample.map(row => row[column.index])}
          />
        )}
        templateColumn={column => <TemplateColumn column={column} onChange={onChange} onSubChange={onSubChange} />}
      />
      {isLoading ? (
        <>{'Loading...'}</>
      ) : (
        <DialogActions>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pt: 2,
            }}
          >
            <Button variant={'contained'} onClick={handleOnContinue} style={{ width: 300 }}>
              {translations.matchColumnsStep.nextButtonTitle}
            </Button>
          </Box>
        </DialogActions>
      )}
    </>
  );
};
