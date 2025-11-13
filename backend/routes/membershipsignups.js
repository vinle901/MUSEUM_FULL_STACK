// backend/routes/membershipsignups.js
import express from 'express';
import db from '../config/database.js';
import middleware from '../utils/middleware.js';
import bcrypt from 'bcrypt';

const router = express.Router();

const formatLocalDate = (date) => {
  if (!date) return null
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    return date.slice(0, 10)
  }
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isISODate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s)

const normalizeDate = (s) => {
  if (!s) return null;
  if (isISODate(s)) return s;

  const m = String(s).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const [, mm, dd, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  throw new Error(`Invalid date format: ${s} (use YYYY-MM-DD)`);
};

const clampDateRange = (startDate, endDate) => {
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];

  const safeEnd = !endDate || endDate > today ? today : endDate;
  let safeStart = startDate && startDate <= safeEnd ? startDate : null;

  if (!safeStart) {
    const endObj = new Date(safeEnd);
    const startObj = new Date(endObj);
    startObj.setDate(startObj.getDate() - 30);
    safeStart = new Date(
      startObj.getTime() - startObj.getTimezoneOffset() * 60000
    )
      .toISOString()
      .split('T')[0];
  }

  if (safeStart > safeEnd) safeStart = safeEnd;
  return { startDate: safeStart, endDate: safeEnd };
};

router.use((req, res, next) => {
  console.log('HIT membershipsignups router:', req.method, req.originalUrl);
  next();
});

router.use(middleware.requireRole('employee', 'admin', 'analyst'));

async function detectUsersTable(connOrPool = db) {
  const [rows] = await connOrPool.query(
    `
      SELECT TABLE_NAME AS name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('users','Users','User')
      LIMIT 1
    `
  );
  if (!rows[0]?.name) {
    throw new Error('Could not find a users table (users/Users/User).');
  }
  const name = String(rows[0].name).replace(/`/g, '');
  return `\`${name}\``; // backticked identifier
}

async function detectMembershipTable(connOrPool = db) {
  const [rows] = await connOrPool.query(
    `
      SELECT TABLE_NAME AS name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('membership','Membership','memberships','Memberships')
      LIMIT 1
    `
  );
  if (!rows[0]?.name) {
    throw new Error('Could not find a Membership table.');
  }
  const name = String(rows[0].name).replace(/`/g, '');
  return `\`${name}\``;
}

async function detectTransactionsTable(connOrPool = db) {
  const [rows] = await connOrPool.query(
    `
      SELECT TABLE_NAME AS name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('Transactions','transactions')
      LIMIT 1
    `
  );
  if (!rows[0]?.name) {
    throw new Error('Could not find a Transactions table.');
  }
  const name = String(rows[0].name).replace(/`/g, '');
  return `\`${name}\``;
}

async function detectMembershipPurchaseTable(connOrPool = db) {
  const [rows] = await connOrPool.query(
    `
      SELECT TABLE_NAME AS name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('Membership_Purchase','membership_purchase')
      LIMIT 1
    `
  );
  if (!rows[0]?.name) {
    throw new Error('Could not find a Membership_Purchase table.');
  }
  const name = String(rows[0].name).replace(/`/g, '');
  return `\`${name}\``;
}

router.get('/', async (req, res) => {
  try {
    const rawS = (req.query.startDate ?? '').trim();
    const rawE = (req.query.endDate ?? '').trim();
    const sNorm = rawS ? normalizeDate(rawS) : null;
    const eNorm = rawE ? normalizeDate(rawE) : null;

    const { startDate, endDate } = clampDateRange(sNorm, eNorm);

    const USERS_TABLE = await detectUsersTable(db);
    const MEMBERSHIP_TABLE = await detectMembershipTable(db);
    const TRANSACTIONS_TABLE = await detectTransactionsTable(db);
    const MEMBERSHIP_PURCHASE_TABLE = await detectMembershipPurchaseTable(db);

    const usersTableName = USERS_TABLE.replace(/`/g, '');
    const [optCols] = await db.query(
      `
        SELECT COLUMN_NAME AS name
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME IN ('phone_number','subscribe_to_newsletter')
      `,
      [usersTableName]
    );

    const hasPhone = optCols.some((c) => c.name === 'phone_number');
    const hasNews = optCols.some((c) => c.name === 'subscribe_to_newsletter');

    const userCols = [
      'u.`user_id`',
      'u.`first_name`',
      'u.`last_name`',
      'u.`email`',
      hasPhone ? 'u.`phone_number`' : 'NULL AS `phone_number`',
      hasNews
        ? 'u.`subscribe_to_newsletter`'
        : '0 AS `subscribe_to_newsletter`',
    ].join(',\n        ');

    const whereClauses = [];
    const queryParams = [];

    if (startDate) {
      whereClauses.push('t.`transaction_date` >= CONVERT_TZ(?, \'America/Chicago\', \'+00:00\')');
      queryParams.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      whereClauses.push('t.`transaction_date` <= CONVERT_TZ(?, \'America/Chicago\', \'+00:00\')');
      queryParams.push(`${endDate} 23:59:59`);
    }
    whereClauses.push('t.`transaction_status` = \'Completed\'');

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [rows] = await db.query(
      `
        SELECT
          ${userCols},
          m.\`membership_id\`,
          m.\`membership_type\`,
          m.\`is_active\`,
          m.\`start_date\`,
          m.\`expiration_date\`,
          COALESCE(mp.\`line_total\`, 0) AS line_total,
          t.\`transaction_date\`         AS purchased_at
        FROM ${MEMBERSHIP_TABLE} m
        JOIN ${USERS_TABLE} u                ON u.\`user_id\`        = m.\`user_id\`
        JOIN ${MEMBERSHIP_PURCHASE_TABLE} mp ON mp.\`membership_id\` = m.\`membership_id\`
        JOIN ${TRANSACTIONS_TABLE} t         ON t.\`transaction_id\` = mp.\`transaction_id\`
        ${whereClause}
        ORDER BY t.\`transaction_date\` ASC, m.\`membership_id\` ASC
      `,
      queryParams
    );

    const [summaryRows] = await db.query(
      `
        SELECT
          COUNT(*)                            AS signupCount,
          SUM(COALESCE(mp.\`line_total\`, 0)) AS totalAmount
        FROM ${MEMBERSHIP_TABLE} m
        JOIN ${MEMBERSHIP_PURCHASE_TABLE} mp ON mp.\`membership_id\` = m.\`membership_id\`
        JOIN ${TRANSACTIONS_TABLE} t         ON t.\`transaction_id\` = mp.\`transaction_id\`
        ${whereClause}
      `,
      queryParams
    );

    const summaryRow = summaryRows[0] || {};

    res.json({
      window: { startDate, endDate },
      summary: {
        signupCount: Number(summaryRow.signupCount || 0),
        totalAmount: Number(summaryRow.totalAmount || 0),
      },
      rows: rows.map((r) => {
        const formatDate = (d) => {
          if (!d) return null
          if (d instanceof Date) {
            const year = d.getUTCFullYear()
            const month = String(d.getUTCMonth() + 1).padStart(2, '0')
            const day = String(d.getUTCDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
          }
          if (typeof d === 'string') {
            return d.slice(0, 10)
          }
          return String(d).slice(0, 10)
        }

        const formatDateTime = (dt) => {
          if (!dt) return null
          const d = dt instanceof Date ? dt : new Date(dt)
          const year = d.getFullYear()
          const month = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          const hours = String(d.getHours()).padStart(2, '0')
          const minutes = String(d.getMinutes()).padStart(2, '0')
          const seconds = String(d.getSeconds()).padStart(2, '0')
          return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
        }

        return {
          user_id: r.user_id,
          first_name: r.first_name,
          last_name: r.last_name,
          email: r.email,
          phone_number: r.phone_number ?? null,
          subscribe_to_newsletter: !!r.subscribe_to_newsletter,
          membership_id: r.membership_id,
          membership_type: r.membership_type,
          start_date: formatDate(r.start_date),
          expiration_date: formatDate(r.expiration_date),
          is_active: !!r.is_active,
          line_total: Number(r.line_total || 0),
          purchased_at: formatDateTime(r.purchased_at),
        }
      }),
    });
  } catch (error) {
    console.error('Membership sign-ups report error:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      sql: error.sql,
    });
    res.status(500).json({ error: error.message });
  }
});

router.post('/membership-signups/member', async (req, res) => {
  const {
    membership_id,
    email,
    first_name = '',
    last_name = '',
    phone_number = null,
    subscribe_to_newsletter = false,
    birthdate = null,
    sex = null,
    membership_type = null,
    start_date = null,
    expiration_date = null,
    is_active = null,
  } = req.body || {};

  if (!membership_id) {
    return res.status(400).json({ error: 'membership_id is required' });
  }
  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  const normalizeSex = (v) => {
    if (v == null) return null;
    const s = String(v).trim().toUpperCase();
    return s === 'M' || s === 'F' ? s : null;
  };

  const sexNorm = normalizeSex(sex);
  const newEmail = String(email).trim().toLowerCase();

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    const USERS_TABLE = await detectUsersTable(conn);
    const MEMBERSHIP_TABLE = await detectMembershipTable(conn);

    const [mRows] = await conn.query(
      `
        SELECT user_id
        FROM ${MEMBERSHIP_TABLE}
        WHERE membership_id = ?
        LIMIT 1
      `,
      [membership_id]
    );
    const m = mRows[0];
    if (!m) throw new Error('Unknown membership_id');

    let user_id = m.user_id;

    const [dupeRows] = await conn.query(
      `
        SELECT user_id
        FROM ${USERS_TABLE}
        WHERE email = ?
          AND user_id <> ?
        LIMIT 1
      `,
      [newEmail, user_id]
    );
    if (dupeRows[0]) throw new Error('Email already in use by another account');

    const paramsUser = [
      newEmail,
      first_name,
      last_name,
      phone_number,
      !!subscribe_to_newsletter,
      birthdate,
    ];
    let setSex = '';
    if (sexNorm) {
      setSex = ', sex = ?';
      paramsUser.push(sexNorm);
    }
    paramsUser.push(user_id);

    await conn.query(
      `
        UPDATE ${USERS_TABLE}
           SET email = ?,
               first_name = ?,
               last_name  = ?,
               phone_number = ?,
               subscribe_to_newsletter = ?,
               birthdate = ?
               ${setSex}
         WHERE user_id = ?
      `,
      paramsUser
    );

    const set = [];
    const vals = [];
    if (membership_type !== null) {
      set.push('membership_type = ?');
      vals.push(membership_type);
    }
    if (start_date !== null) {
      set.push('start_date = ?')
      vals.push(formatLocalDate(start_date))
    }
    if (expiration_date !== null) {
      set.push('expiration_date = ?')
      vals.push(formatLocalDate(expiration_date))
    }
    if (is_active !== null) {
      set.push('is_active = ?');
      vals.push(!!is_active);
    }

    if (set.length > 0) {
      vals.push(membership_id, user_id);
      await conn.query(
        `
          UPDATE ${MEMBERSHIP_TABLE}
             SET ${set.join(', ')}
           WHERE membership_id = ?
             AND user_id = ?
        `,
        vals
      );
    }

    await conn.commit();
    return res.json({ ok: true, user_id, membership_id });
  } catch (e) {
    if (conn) await conn.rollback();
    console.error('Member update error:', e);
    return res.status(400).json({ error: e.message || 'Member update failed' });
  } finally {
    if (conn) conn.release();
  }
});

router.post('/membership-signups/checkout', async (req, res) => {
  const { users, membership, payment } = req.body;

  try {
    if (!users || !users.email) {
      return res.status(400).json({ error: 'User email is required' });
    }
    const mType = membership?.membership_type;
    if (!mType) {
      return res.status(400).json({ error: 'membership_type is required' });
    }

    const start_date = membership?.start_date ? formatLocalDate(membership.start_date) : null
    const expiration_date = membership?.expiration_date ? formatLocalDate(membership.expiration_date) : null

    const PLAN_PRICES = { Individual: 70, Dual: 95, Family: 115, Patron: 200 };
    const expectedTotal = PLAN_PRICES[mType] || 0;

    if (payment?.amount != null && Number(payment.amount) !== expectedTotal) {
      return res.status(400).json({
        error: `Amount mismatch. Expected ${expectedTotal}, got ${payment.amount}`,
      });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const USERS_TABLE = await detectUsersTable(conn);
      const MEMBERSHIP_TABLE = await detectMembershipTable(conn);
      const TRANSACTIONS_TABLE = await detectTransactionsTable(conn);
      const MEMBERSHIP_PURCHASE_TABLE = await detectMembershipPurchaseTable(
        conn
      );

      const usersTableName = USERS_TABLE.replace(/`/g, '');
      const [cols] = await conn.query(
        `
          SELECT COLUMN_NAME AS name
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
            AND COLUMN_NAME IN ('password','password_hash','require_password_change')
        `,
        [usersTableName]
      );

      const hasPasswordCol = cols.some((c) => c.name === 'password');
      const hasHashCol = cols.some((c) => c.name === 'password_hash');
      const hasRequireFlag = cols.some(
        (c) => c.name === 'require_password_change'
      );

      const rawTemp =
        users.temp_password || Math.random().toString(36).slice(2, 10);
      const pwHash = await bcrypt.hash(String(rawTemp), 10);

      const uFields = [
        'first_name',
        'last_name',
        'email',
        'phone_number',
        'subscribe_to_newsletter',
        'birthdate',
        'sex',
      ];
      const uPH = ['?', '?', '?', '?', '?', '?', '?'];
      const uVals = [
        users.first_name || '',
        users.last_name || '',
        String(users.email).toLowerCase(),
        users.phone_number || null,
        !!users.subscribe_to_newsletter,
        users.birthdate || null,
        users.sex || null,
      ];

      if (hasPasswordCol) {
        uFields.push('password');
        uPH.push('?');
        uVals.push(pwHash);
      }
      if (hasHashCol) {
        uFields.push('password_hash');
        uPH.push('?');
        uVals.push(pwHash);
      }
      if (hasRequireFlag) {
        uFields.push('require_password_change');
        uPH.push('?');
        uVals.push(1);
      }

      const rawUsersTable = usersTableName; // plain name
      const uSql = `
        INSERT INTO \`${rawUsersTable}\` (${uFields.join(', ')})
        VALUES (${uPH.join(', ')})
        ON DUPLICATE KEY UPDATE
          first_name = VALUES(first_name),
          last_name  = VALUES(last_name),
          phone_number = VALUES(phone_number),
          subscribe_to_newsletter = VALUES(subscribe_to_newsletter),
          birthdate = VALUES(birthdate),
          sex = VALUES(sex)
          ${hasPasswordCol ? ', password = VALUES(password)' : ''}
          ${hasHashCol ? ', password_hash = VALUES(password_hash)' : ''}
          ${
            hasRequireFlag
              ? ', require_password_change = VALUES(require_password_change)'
              : ''
          }
      `;

      const [userRows] = await conn.query(uSql, uVals);

      let user_id = userRows.insertId;
      if (!user_id) {
        const [uRows] = await conn.query(
          `
            SELECT user_id
            FROM ${USERS_TABLE}
            WHERE email = ?
            LIMIT 1
          `,
          [String(users.email).toLowerCase()]
        );
        user_id = uRows[0]?.user_id;
      }
      if (!user_id) throw new Error('Could not resolve user_id');

      const txTableName = TRANSACTIONS_TABLE.replace(/`/g, '');
      const [txCols] = await conn.query(
        `
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
            AND COLUMN_NAME IN ('user_id','customer_id')
        `,
        [txTableName]
      );
      const hasTxUserId = txCols.some((c) => c.COLUMN_NAME === 'user_id');
      const hasTxCustomerId = txCols.some(
        (c) => c.COLUMN_NAME === 'customer_id'
      );

      const mpTableName = MEMBERSHIP_PURCHASE_TABLE.replace(/`/g, '');
      const [mpCols] = await conn.query(
        `
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
            AND COLUMN_NAME IN ('user_id')
        `,
        [mpTableName]
      );
      const hasMpUserId = mpCols.some((c) => c.COLUMN_NAME === 'user_id');

      let txSql;
      let txParams;
      if (hasTxUserId) {
        txSql = `
          INSERT INTO ${TRANSACTIONS_TABLE} (user_id, transaction_date, total_price, transaction_status)
          VALUES (?, NOW(), ?, 'Completed')
        `;
        txParams = [user_id, expectedTotal];
      } else if (hasTxCustomerId) {
        txSql = `
          INSERT INTO ${TRANSACTIONS_TABLE} (customer_id, transaction_date, total_price, transaction_status)
          VALUES (?, NOW(), ?, 'Completed')
        `;
        txParams = [user_id, expectedTotal];
      } else {
        txSql = `
          INSERT INTO ${TRANSACTIONS_TABLE} (transaction_date, total_price, transaction_status)
          VALUES (NOW(), ?, 'Completed')
        `;
        txParams = [expectedTotal];
      }

      const [txRows] = await conn.query(txSql, txParams);
      const transaction_id = txRows.insertId;

      const [mRows2] = await conn.query(
        `
          INSERT INTO ${MEMBERSHIP_TABLE} (user_id, membership_type, start_date, expiration_date, is_active)
          VALUES (?, ?, ?, ?, TRUE)
        `,
        [user_id, mType, start_date, expiration_date]
      );
      const membership_id = mRows2.insertId;

      if (hasMpUserId) {
        await conn.query(
          `
            INSERT INTO ${MEMBERSHIP_PURCHASE_TABLE}
              (membership_id, transaction_id, user_id, is_renewal, line_total)
            VALUES (?, ?, ?, ?, ?)
          `,
          [membership_id, transaction_id, user_id, false, expectedTotal]
        );
      } else {
        await conn.query(
          `
            INSERT INTO ${MEMBERSHIP_PURCHASE_TABLE}
              (membership_id, transaction_id, is_renewal, line_total)
            VALUES (?, ?, ?, ?)
          `,
          [membership_id, transaction_id, false, expectedTotal]
        );
      }

      await conn.commit();
      return res.json({
        ok: true,
        transaction_id,
        membership_id,
        total_charged: expectedTotal,
        temp_password: rawTemp,
      });
    } catch (err) {
      await conn.rollback();
      console.error('Checkout TX error:', err);
      return res.status(400).json({ error: err.message || 'Checkout failed' });
    } finally {
      conn.release();
    }
  } catch (outer) {
    console.error('Checkout outer error:', outer);
    return res.status(400).json({ error: outer.message || 'Checkout failed' });
  }
});

export default router;
