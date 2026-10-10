import type { Route } from '@/types';
import { ViewType } from '@/types';
import ofetch from '@/utils/ofetch';

interface Meme {
    alt?: string;
    name?: string;
    preview?: string;
    original?: string;
    category?: string;
    story?: { zh?: string; origin?: string; contributor?: string };
}

interface GalleryResponse {
    gallery: Record<string, { images?: Meme[] }>;
}

const baseUrl = 'https://aigengtu.com';
const link = `${baseUrl}/archive`;

export const route: Route = {
    path: '/aigengtu',
    name: '梗鲸最新表情包',
    url: 'aigengtu.com',
    example: '/private-interest/aigengtu',
    categories: ['picture'],
    features: { requireConfig: false, requirePuppeteer: false, antiCrawler: false, supportBT: false, supportPodcast: false, supportScihub: false },
    radar: [{ source: ['aigengtu.com/', 'aigengtu.com/archive'], target: '/aigengtu' }],
    view: ViewType.Pictures,
    maintainers: ['SerchenWang'],
    handler,
};

async function handler() {
    const bucket = new Date().toISOString().slice(0, 7);
    const data = await ofetch<GalleryResponse>(`${baseUrl}/gallery-index.json`, { query: { m: bucket } });
    const items = Object.values(data.gallery)
        .flatMap((group) => group.images || [])
        .map((meme) => {
            const imageUrl = meme.original || meme.preview;
            const id = imageUrl?.match(/\/(\d+)\.[a-z0-9]+(?:\?.*)?$/i)?.[1];
            return { meme, id, number: id ? Number.parseInt(id) : 0 };
        })
        .filter(({ id }) => id)
        .toSorted((a, b) => b.number - a.number)
        .slice(0, 50)
        .map(({ meme, id }) => {
            const imageUrl = meme.original || meme.preview;
            const paragraphs = [meme.story?.zh, meme.story?.origin, meme.story?.contributor ? `投稿者：${meme.story.contributor}` : undefined]
                .filter(Boolean)
                .map((text) => `<p>${text}</p>`)
                .join('');
            return {
                title: meme.name || meme.alt || `表情包 #${id}`,
                link: `${baseUrl}/zh/meme/${id}`,
                guid: `aigengtu-${id}`,
                category: meme.category ? [meme.category] : undefined,
                image: meme.preview || imageUrl,
                description: `${imageUrl ? `<p><img src="${imageUrl}" alt="${meme.alt || meme.name || ''}"></p>` : ''}${paragraphs}`,
            };
        });
    return {
        title: '梗鲸 - 最新表情包',
        description: '梗鲸与蓝色大肥鱼档案馆最新收录，图片使用原站直链。',
        link,
        item: items,
    };
}
