import { CompositeClause } from './composite-clause.model';
import { QueryError } from '../../errors/query.error';
import { QueryPart } from './query-part.model';
import { DbHelperModel } from '../db-helper-model.model';
import { retryWhen } from 'rxjs/operator/retryWhen';
import { QueryManager } from '../../managers/query-manager';
import { QueryResult } from '../../interfaces/query-result.interface';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { ModelManager } from '../../managers/model-manager';
import { DbQuery } from '../db-query.model';
import { ClauseGroup } from './clause-group.model';
import { Clause } from './clause.model';

/**
 * @public
 * @class QueryUpdate
 *
 * @description
 * For design reasons this class should not be used directly. Use this class with {@link Update} function.
 *
 * @param T @extends DbHelperModel a model declared with table and column annotations
 *
 * @example
 * ```typescript
 * // update todo object
 * Update(todo).exec().subscribe((qr: QueryResult<any>) => {
 *      // do something with the result...
 * }, (err) => {
 *      // do something with the error...
 * });
 * ```
 *
 * @author  Olivier Margarit
 * @since   0.1
 */
export class QueryUpdate<T extends DbHelperModel> {
    /**
     * @private
     * @constant {string} type the type of statement, should not be modified
     */
    private readonly type = 'UPDATE';

    /**
     * @private
     * @property {ClauseGroup} whereClauses clause group instance containing
     * where clauses
     */
    private whereClauses: ClauseGroup;

    /**
     * @private
     * @property {{[index: string]: any}} valueSet set of values where key are column name and value,
     * the value to update.
     */
    private valueSet: {[index: string]: any};

    /**
     * @public
     * @constructor should not be use directly, see class header
     *
     * @param {T | {new (): T}} model model instance or model
     */
    public constructor(private model: T | {new (): T}) {}

    /**
     * @public
     * @method where is the method to add clauses to the where statement of the query
     * see {@link Clause} or {@link ClauseGroup}
     *
     * @param {Clause|Clause[]|CompositeClause|ClauseGroup|{[index: string]: any}} clauses  where clauses
     *
     * @return {QueryUpdate<T>} this instance to chain query instructions
     */
    public where(clauses: Clause|Clause[]|CompositeClause|ClauseGroup|{[index: string]: any}): QueryUpdate<T> {
        if (!this.whereClauses) {
            this.whereClauses = new ClauseGroup();
        }
        this.whereClauses.add(clauses);
        return this;
    }

    /**
     * @public
     * @method where is the method to add clauses to the where statement of the query
     * see {@link Clause} or {@link ClauseGroup}
     *
     * @throws {@link QueryError} on set on single model update. set method is for updating
     *          many entries of a specific table target from its class.
     *
     * @param {{[index: string]: any}} dict map of column and values to update.
     *
     * @return {QueryUpdate<T>} this instance to chain query instructions
     */
    public set(dict: {[index: string]: any}): QueryUpdate<T> {
        if ((this.model as {[index: string]: any}).$$isDbHelperModel) {
            throw(new QueryError('Try to set values on Update query' +
                ' already containing a model. This is not supported', '', ''));
        }
        if (this.valueSet) {
            // merge values
            for (const key in dict) {
                if (dict.hasOwnProperty(key)) {
                    this.valueSet[key] = dict[key];
                }
            }
        } else {
            this.valueSet = dict;
        }
        return this;
    }

    /**
     * @private
     * @method getValuesFromModel build values part of the query from the model.
     *
     * @return {QueryPart} the values query part of update statement
     */
    private getValuesFromModel(): QueryPart {
        const table = ModelManager.getInstance().getModel(this.model);
        const queryPart = new QueryPart();
        const columnsToUpdate = <string[]>[];
        for (const column of table.columnList) {
            let value = (this.model as DbHelperModel).getColumnValue(column.name);
            value = value === undefined ? null : value;
            if ((this.model as {[index: string]: any}).$$partialWithProjection) {
                if ((this.model as {[index: string]: any}).$$partialWithProjection.indexOf(column.name) >= 0 ||
                    (this.model as {[index: string]: any})[column.field]) {
                    columnsToUpdate.push(column.name);
                    if (value && (value as {[index: string]: any}).$$isDbHelperModel) {
                        queryPart.params.push((value as {[index: string]: any})[column.field]);
                    } else {
                        queryPart.params.push(value === undefined ? null : value);
                    }
                }
            } else {
                columnsToUpdate.push(column.name);
                if (value && (value as {[index: string]: any}).$$isDbHelperModel) {
                    queryPart.params.push((value as {[index: string]: any})[column.field]);
                } else {
                    queryPart.params.push(value === undefined ? null : value);
                }
            }
        }
        queryPart.content = 'SET ' + columnsToUpdate.join(' = (?), ') + ' = (?)';
        return queryPart;
    }

    /**
     * @private
     * @method getValuesFromSet build values part of the query from the set dict.
     *
     * @return {QueryPart} the values query part of update statement
     */
    private getValuesFromSet(): QueryPart {
        const queryPart = new QueryPart();
        for (const key in this.valueSet) {
            if (this.valueSet.hasOwnProperty(key)) {
                queryPart.content += queryPart.content ? ', (?)' : '(?)';
                queryPart.params.push(this.valueSet[key]);
            }
        }
        return queryPart;
    }

    /**
     * @public
     * @method build should be removed to be a part of the private API
     *
     * @return {DbQuery} of the query with the string part and
     *          clauses params.
     */
    public build(): DbQuery {
        const table = ModelManager.getInstance().getModel(this.model);
        const dbQuery = new DbQuery();
        dbQuery.table = table.name;
        dbQuery.type = this.type;
        const rowid = (this.model as {[index: string]: any})['$$rowid'];
        if ((this.model as {[index: string]: any}).$$isDbHelperModel && (rowid || rowid === 0)) {
            const clause = new Clause();
            clause.key = 'rowid';
            clause.value = rowid;
            this.where(clause);
        } else {
            for (const column of table.columnList) {
                if (column.primaryKey) {
                    const clause = new Clause();
                    clause.key = column.name;
                    clause.value = (this.model as {[index: string]: any})[column.field];
                    this.where(clause);
                }
            }
        }
        // setup values to update
        dbQuery.query += this.type + ' ' + dbQuery.table;
        let queryPart: QueryPart;
        if ((this.model as {[index: string]: any}).$$isDbHelperModel) {
            queryPart = this.getValuesFromModel();
        } else if (this.valueSet && Object.getOwnPropertyNames(this.valueSet).length) {
            queryPart = this.getValuesFromSet();
        } else {
            throw(new QueryError('No values to update on Update query build, ' +
                'please use set method or call Update with a single model.', '', ''));
        }
        dbQuery.append(queryPart);

        if (this.whereClauses) {
            dbQuery.query += ' WHERE';
            dbQuery.append(this.whereClauses.build());
        }
        return dbQuery;
    }

    /**
     * @public
     * @method exec to execute the query and asynchronously retreive result.
     *
     * @return {Observable<QueryResult<any>>} observable to subscribe
     */
    public exec(): Observable<QueryResult<any>> {
        return QueryManager.getInstance().query(this.build());
    }
}
