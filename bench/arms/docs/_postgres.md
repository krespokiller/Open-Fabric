## PostgreSQL 16 reference (excerpts)

**Data types.** `BIGINT` stores 64-bit integers. `BIGSERIAL` is an auto-incrementing `BIGINT` (a sequence default). `TEXT` has no length limit. A `CHECK (expr)` constraint rejects rows where `expr` is false.

**CREATE TABLE IF NOT EXISTS** does nothing (with a notice) when a table with that name already exists.

**INSERT ... ON CONFLICT.** `INSERT INTO t (...) VALUES (...) ON CONFLICT DO NOTHING` skips the row when it would violate a unique or primary-key constraint; the command reports 0 rows inserted. `ON CONFLICT (col) DO UPDATE SET ...` updates the existing row instead.

**RETURNING.** `INSERT`, `UPDATE` and `DELETE` accept `RETURNING col, ...` (or `RETURNING *`) and then return the affected rows like a `SELECT`.

**Row counts.** Every `UPDATE` reports how many rows it changed. An `UPDATE ... WHERE <condition>` that matches no rows changes nothing and reports 0.

**Transactions.** `BEGIN` starts a transaction, `COMMIT` makes its changes visible to others, `ROLLBACK` discards them. If any statement fails inside a transaction, the transaction is aborted and must be rolled back.

**Read Committed isolation (the default).** A statement sees only data committed before it began. When an `UPDATE` finds a target row that a concurrent transaction is updating, it waits for that transaction to commit or roll back. If the other transaction committed, the `UPDATE` re-evaluates its `WHERE` condition against the new version of the row and only proceeds if the row still matches.

**Row locks.** `SELECT ... FOR UPDATE` locks the selected rows until the end of the current transaction; other transactions trying to update or lock those rows wait.

**Aggregates.** `SUM(x)` returns NULL when there are no rows; `COALESCE(SUM(x), 0)` returns 0 instead. `SUM(x) FILTER (WHERE cond)` sums only the rows matching `cond`. `EXISTS (subquery)` is true when the subquery returns at least one row.

**UPDATE ... FROM.** `UPDATE a SET col = a.col + b.n FROM b WHERE b.a_id = a.id` updates `a` using values joined from `b`.
