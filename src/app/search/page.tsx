import { Metadata } from 'next';
import { getMenus, getSiteSettings, getCategories, getTags } from '@/lib/services/settings';
import { db } from '@/lib/db';
import SimpleNavigation from '@/components/SimpleNavigation';
import SimpleFooter from '@/components/SimpleFooter';
import SearchClient from './page.client';
import Sidebar from '@/components/Sidebar';
import { adaptMenus } from '@/lib/utils/menu-adapters';

export const metadata: Metadata = {
  title: '搜索结果 - 向阳乔木的个人博客',
  description: '搜索向阳乔木的个人博客上的文章',
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; tag?: string; page?: string }>;
}) {
  // 在 Next.js 中，searchParams 是一个只读对象，需要先解构出来
  const params = await searchParams;
  const query = params.q || '';
  const categoryId = params.category || '';
  const tagId = params.tag || '';
  const page = parseInt(params.page || '1', 10);

  // 获取菜单、网站设置、分类和标签
  const [menus, settings, categories, tags] = await Promise.all([
    getMenus(),
    getSiteSettings(),
    getCategories(),
    getTags()
  ]);

  // 获取网站名称
  const siteTitle = settings['site_name'] || '向阳乔木的个人博客';

  return (
    <div>
      <SimpleNavigation siteTitle={siteTitle} menus={adaptMenus(menus)} />

      <main className="container px-2 pt-4 pb-8">
        <div className="max-w-6xl mx-auto px-0 sm:px-4 lg:px-8 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左侧内容区 */}
            <div className="col-span-1 lg:col-span-2">
              <SearchClient
                initialQuery={query}
                initialCategoryId={categoryId}
                initialTagId={tagId}
                initialPage={page}
              />
            </div>

            {/* 右侧边栏 */}
            <div className="col-span-1">
              <Sidebar
                categories={categories}
                tags={tags}
                showCategories={true}
                showPopularTags={true}
                showRecentPosts={true}
                showLatestPosts={true}
              />
            </div>
          </div>
        </div>
      </main>

      <SimpleFooter />
    </div>
  );
}
