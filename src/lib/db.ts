import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { sql, eq } from 'drizzle-orm';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

console.log('数据库模块初始化开始');

// 检查数据库文件是否存在
// 在Vercel环境中，使用demo.db作为默认数据库
const isVercel = process.env.VERCEL === '1';
const dbPath = path.resolve(process.cwd(), './demo.db');
const dbExists = fs.existsSync(dbPath);
console.log('数据库文件路径:', dbPath);
console.log('数据库文件是否存在:', dbExists);
console.log('是否在Vercel环境:', isVercel);

// 初始化 SQLite 数据库连接
let sqlite: Database.Database;
try {
  sqlite = new Database(dbPath, { verbose: console.log });
  console.log('SQLite 数据库连接成功');
} catch (error) {
  console.error('SQLite 数据库连接失败:', error);
  throw error; // 重新抛出错误，确保应用程序知道数据库连接失败
}

// 创建表函数
const createTables = () => {
  // 只有在数据库文件不存在时才创建表
  if (dbExists) {
    console.log('数据库已存在，跳过表创建');
    return;
  }

  console.log('开始创建数据库表...');
  try {
    // Create users table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create categories table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Create posts table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        published INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        authorId INTEGER REFERENCES users(id),
        categoryId INTEGER REFERENCES categories(id)
      );
    `);

    // Create tags table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create post_tags table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS post_tags (
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (post_id, tag_id)
      );
    `);

    // Create post_categories table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS post_categories (
        postId INTEGER REFERENCES posts(id),
        categoryId INTEGER REFERENCES categories(id),
        PRIMARY KEY (postId, categoryId)
      );
    `);

    // Create menus table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS menus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        url TEXT,
        is_external INTEGER DEFAULT 0 NOT NULL,
        parent_id INTEGER,
        sort_order INTEGER DEFAULT 0 NOT NULL,
        is_active INTEGER DEFAULT 1 NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TEXT
      );
    `);

    // Create media table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        altText TEXT,
        width INTEGER,
        height INTEGER,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 创建网站设置表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        setting_group TEXT NOT NULL DEFAULT 'general',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TEXT
      );
    `);

    // 创建社交媒体链接表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS social_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        url TEXT NOT NULL,
        icon TEXT,
        display_name TEXT,
        order INTEGER DEFAULT 0 NOT NULL,
        is_active INTEGER DEFAULT 1 NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TEXT
      );
    `);

    // 创建联系方式表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS contact_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        qr_code_url TEXT,
        display_name TEXT,
        is_active INTEGER DEFAULT 1 NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TEXT
      );
    `);

    // 创建打赏信息表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS donation_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        qr_code_url TEXT NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1 NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TEXT
      );
    `);

    // 创建Hero区域设置表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS hero_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        subtitle TEXT,
        background_image_url TEXT,
        button_text TEXT,
        button_url TEXT,
        is_active INTEGER DEFAULT 1 NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TEXT
      );
    `);

    console.log('数据库表创建成功');
  } catch (error) {
    console.error('创建数据库表出错:', error);
    throw error; // 重新抛出错误，确保应用程序知道表创建失败
  }
};

// 初始化数据库 - 只调用一次创建表函数
try {
  createTables();

  // 检查数据库是否有数据，如果没有则添加一些测试数据
  const tagCount = sqlite.prepare('SELECT COUNT(*) as count FROM tags').get() as { count: number };
  if (tagCount.count === 0) {
    console.log('添加测试标签数据...');
    sqlite.exec(`
      INSERT INTO tags (name, slug, description, created_at) VALUES
      ('JavaScript', 'javascript', 'JavaScript编程语言相关文章', CURRENT_TIMESTAMP),
      ('React', 'react', 'React框架相关文章', CURRENT_TIMESTAMP),
      ('Next.js', 'nextjs', 'Next.js框架相关文章', CURRENT_TIMESTAMP);
    `);
  }

  const postCount = sqlite.prepare('SELECT COUNT(*) as count FROM posts').get() as { count: number };
  if (postCount.count === 0) {
    console.log('添加测试文章数据...');
    sqlite.exec(`
      INSERT INTO posts (title, slug, content, excerpt, published, createdAt, updatedAt) VALUES
      ('第一篇博客文章', 'first-post', '这是第一篇博客文章的内容。', '这是摘要', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('第二篇博客文章', 'second-post', '这是第二篇博客文章的内容。', '这是摘要', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('草稿文章', 'draft-post', '这是一篇草稿文章。', '这是摘要', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    `);
  }

  const menuCount = sqlite.prepare('SELECT COUNT(*) as count FROM menus').get() as { count: number };
  if (menuCount.count === 0) {
    console.log('添加测试菜单数据...');
    sqlite.exec(`
      INSERT INTO menus (name, description, url, is_external, parent_id, sort_order, is_active, created_at) VALUES
      ('首页', '网站首页', '/', 0, NULL, 0, 1, CURRENT_TIMESTAMP),
      ('博客', '博客文章列表', '/blog', 0, NULL, 10, 1, CURRENT_TIMESTAMP),
      ('关于', '关于页面', '/about', 0, NULL, 20, 1, CURRENT_TIMESTAMP),
      ('GitHub', 'GitHub主页', 'https://github.com', 1, NULL, 30, 1, CURRENT_TIMESTAMP);
    `);
  }

  // 添加默认分类
  try {
    const categoryCount = sqlite.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
    if (categoryCount.count === 0) {
      console.log('添加默认分类数据...');
      sqlite.exec(`
        INSERT INTO categories (name, slug, description, created_at) VALUES
        ('未分类', 'uncategorized', '默认分类', CURRENT_TIMESTAMP),
        ('技术', 'technology', '技术相关文章', CURRENT_TIMESTAMP),
        ('生活', 'life', '生活相关文章', CURRENT_TIMESTAMP);
      `);
    }
  } catch (error) {
    console.error('添加默认分类失败:', error);
  }

  // 添加默认网站设置
  try {
    const settingsCount = sqlite.prepare('SELECT COUNT(*) as count FROM site_settings').get() as { count: number };
    if (settingsCount.count === 0) {
      console.log('添加默认网站设置数据...');
      sqlite.exec(`
        INSERT INTO site_settings (key, value, setting_group) VALUES
        ('title', '向阳乔木的个人博客', 'general'),
        ('description', '分享技术、生活和思考，记录成长的点滴。', 'general'),
        ('logo', '/images/logo.png', 'general'),
        ('favicon', '/favicon.ico', 'general'),
        ('copyright', ' 2025 向阳乔木的个人博客. All rights reserved.', 'general');
      `);
    }
  } catch (error) {
    console.error('添加默认网站设置失败:', error);
  }

  // 添加默认社交媒体链接
  try {
    const socialCount = sqlite.prepare('SELECT COUNT(*) as count FROM social_links').get() as { count: number };
    if (socialCount.count === 0) {
      console.log('添加默认社交媒体链接数据...');
      sqlite.exec(`
        INSERT INTO social_links (platform, url, icon, display_name, order) VALUES
        ('github', 'https://github.com', 'github', 'GitHub', 0),
        ('twitter', 'https://twitter.com', 'twitter', 'Twitter', 1),
        ('weibo', 'https://weibo.com', 'weibo', '微博', 2);
      `);
    }
  } catch (error) {
    console.error('添加默认社交媒体链接失败:', error);
  }

  // 添加默认联系方式
  try {
    const contactCount = sqlite.prepare('SELECT COUNT(*) as count FROM contact_info').get() as { count: number };
    if (contactCount.count === 0) {
      console.log('添加默认联系方式数据...');
      sqlite.exec(`
        INSERT INTO contact_info (type, value, display_name) VALUES
        ('email', 'example@example.com', '邮箱'),
        ('wechat', 'wechat_id', '微信');
      `);
    }
  } catch (error) {
    console.error('添加默认联系方式失败:', error);
  }

  // 添加默认Hero区域设置
  try {
    const heroCount = sqlite.prepare('SELECT COUNT(*) as count FROM hero_settings').get() as { count: number };
    if (heroCount.count === 0) {
      console.log('添加默认Hero区域设置数据...');
      sqlite.exec(`
        INSERT INTO hero_settings (title, subtitle, background_image_url, button_text, button_url) VALUES
        ('向阳乔木的个人博客', '分享技术、生活和思考', '/images/hero-bg.jpg', '了解更多', '/about');
      `);
    }
  } catch (error) {
    console.error('添加默认Hero区域设置失败:', error);
  }

  console.log('数据库初始化完成');
} catch (error) {
  console.error('数据库初始化失败:', error);
}

// 初始化 Drizzle ORM
const db = drizzle(sqlite, { schema });
console.log('Drizzle ORM 初始化完成');

// 导出数据库实例
export { db, sqlite };
