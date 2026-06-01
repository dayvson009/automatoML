const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const getFilePath = (table) => path.join(dbDir, `${table}.json`);

const readTable = (table) => {
  const filePath = getFilePath(table);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(data) ? data : [data];
  } catch (e) {
    return [];
  }
};

const writeTable = (table, data) => {
  const filePath = getFilePath(table);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

const db = {
  get: (table) => readTable(table),
  
  find: (table, query = {}) => {
    const data = readTable(table);
    return data.filter(item => {
      for (let key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
  },
  
  findOne: (table, query = {}) => {
    const data = readTable(table);
    return data.find(item => {
      for (let key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
  },
  
  insert: (table, item) => {
    const data = readTable(table);
    const newItem = {
      id: data.length > 0 ? Math.max(...data.map(i => i.id || 0)) + 1 : 1,
      created_at: new Date().toISOString(),
      ...item
    };
    data.push(newItem);
    writeTable(table, data);
    return newItem;
  },
  
  update: (table, query, updates) => {
    const data = readTable(table);
    let updatedCount = 0;
    const updatedData = data.map(item => {
      let match = true;
      for (let key in query) {
        if (item[key] !== query[key]) {
          match = false;
          break;
        }
      }
      if (match) {
        updatedCount++;
        return { ...item, ...updates };
      }
      return item;
    });
    writeTable(table, updatedData);
    return updatedCount;
  },
  
  delete: (table, query) => {
    const data = readTable(table);
    const filtered = data.filter(item => {
      let match = true;
      for (let key in query) {
        if (item[key] !== query[key]) {
          match = false;
          break;
        }
      }
      return !match;
    });
    writeTable(table, filtered);
    return data.length - filtered.length;
  }
};

// Seeding do Administrador Padrão se a tabela de usuários estiver vazia
const admin = db.findOne('users', { email: 'admin@admin.com' });
if (!admin) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.insert('users', {
    email: 'admin@admin.com',
    password_hash: hash,
    role: 'admin',
    is_active: 1
  });
  console.log('Usuário admin padrão criado: admin@admin.com / admin123');
}

// Seeding das Configurações Globais se a tabela estiver vazia
const settings = db.findOne('settings', { id: 1 });
if (!settings) {
  db.insert('settings', {
    id: 1,
    redirect_uri: 'http://localhost:3000/tg'
  });
  console.log('Configurações globais padrão criadas.');
}

module.exports = db;
