import { v4 as uuidv4 } from 'uuid';
import db from '../lib/db.js';

export interface ParsedMetadata {
    category: string;
    mainTopic: string;
    subTopic: string;
    cleanTitle: string;
    partNumber?: number;
    teacher?: string;
    batch?: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'Grammar': ['Grammar', 'Tense', 'Noun', 'Verb', 'Syntax', 'Voice', 'Narration'],
    'Literature': ['Literature', 'Poem', 'Poetry', 'Drama', 'Criticism', 'History of English', 'Victorian', 'Romanticism', 'Modernism', 'Movement'],
    'Linguistics': ['Linguistics', 'Phonetics', 'Morphology', 'Sociolinguistics'],
    'Poetry': ['Sonnet', 'Ode', 'Elegy', 'Poem'],
    'Drama': ['Play', 'Shakespeare', 'Tragedy', 'Comedy'],
};

export class MetadataParser {
    static parse(caption: string, fileName: string): ParsedMetadata {
        const metadata: ParsedMetadata = {
            category: 'Miscellaneous',
            mainTopic: 'General',
            subTopic: 'Miscellaneous',
            cleanTitle: '',
        };

        const combinedText = (caption || '') + ' ' + (fileName || '');
        
        // 1. Clean noise first
        let workingTitle = fileName || '';
        workingTitle = workingTitle.replace(/\.(mp4|pdf|mkv|avi|zip)$/i, '');
        workingTitle = workingTitle.replace(/─────.*?─────/g, '');
        workingTitle = workingTitle.replace(/VID ID\s*:\s*\d+/gi, '');
        workingTitle = workingTitle.replace(/EXTRACTED BY/gi, '');
        workingTitle = workingTitle.replace(/[🎥💠📝📘📁📄]/g, '');
        
        // 2. Extract structured fields if present in caption
        if (caption) {
            const topicMatch = caption.match(/TOPIC\s*:\s*([^💠🎥📝\n]+)/i);
            const batchMatch = caption.match(/BATCH\s*:\s*([^💠🎥📝\n]+)/i);
            const titleMatch = caption.match(/TITLE\s*:\s*([^💠🎥📝\n]+)/i);
            const teacherMatch = caption.match(/TEACHER\s*:\s*([^💠🎥📝\n]+)/i);

            if (topicMatch) metadata.mainTopic = topicMatch[1].trim();
            if (batchMatch) metadata.batch = batchMatch[1].trim();
            if (teacherMatch) metadata.teacher = teacherMatch[1].trim();
            if (titleMatch) {
                workingTitle = titleMatch[1].trim();
            }
        }

        // 3. Extract Part/Lecture number
        const partMatch = combinedText.match(/(Part|Lecture|L|Ep|Chapter)\s*[-_]?\s*(\d+)/i);
        if (partMatch) {
            metadata.partNumber = parseInt(partMatch[2]);
        }

        // 4. Handle common patterns: "Topic - Subtopic"
        if (workingTitle.includes('-')) {
            const parts = workingTitle.split('-').map(p => p.trim());
            if (parts.length >= 2) {
                metadata.mainTopic = parts[0];
                metadata.subTopic = parts[1];
                metadata.cleanTitle = parts[1];
            } else {
                metadata.cleanTitle = workingTitle;
            }
        } else {
            metadata.cleanTitle = workingTitle;
            metadata.subTopic = workingTitle;
        }

        // 5. Intelligent Category Assignment
        for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
            if (keywords.some(k => combinedText.toLowerCase().includes(k.toLowerCase()))) {
                metadata.category = cat;
                break;
            }
        }

        // Final cleanup of cleanTitle (remove part info from title string)
        metadata.cleanTitle = metadata.cleanTitle.replace(/(Part|Lecture|L|Ep|Chapter)\s*[-_]?\s*\d+/gi, '').trim();
        if (!metadata.cleanTitle) metadata.cleanTitle = workingTitle;

        return metadata;
    }

    static getOrCreateHierarchy(metadata: ParsedMetadata) {
        // Ensure Category exists
        let categoryId: string;
        const catRow = db.prepare('SELECT id FROM categories WHERE name = ?').get(metadata.category) as any;
        if (catRow) {
            categoryId = catRow.id;
        } else {
            categoryId = uuidv4();
            db.prepare('INSERT INTO categories (id, name, icon) VALUES (?, ?, ?)').run(categoryId, metadata.category, 'Book');
        }

        // Ensure Main Topic exists
        let mainTopicId: string;
        const mainRow = db.prepare('SELECT id FROM main_topics WHERE category_id = ? AND name = ?').get(categoryId, metadata.mainTopic) as any;
        if (mainRow) {
            mainTopicId = mainRow.id;
        } else {
            mainTopicId = uuidv4();
            db.prepare('INSERT INTO main_topics (id, category_id, name) VALUES (?, ?, ?)').run(mainTopicId, categoryId, metadata.mainTopic);
        }

        // Ensure Sub Topic exists
        let subTopicId: string;
        const subRow = db.prepare('SELECT id FROM sub_topics WHERE main_topic_id = ? AND name = ?').get(mainTopicId, metadata.subTopic) as any;
        if (subRow) {
            subTopicId = subRow.id;
        } else {
            subTopicId = uuidv4();
            db.prepare('INSERT INTO sub_topics (id, main_topic_id, name) VALUES (?, ?, ?)').run(subTopicId, mainTopicId, metadata.subTopic);
        }

        return { categoryId, mainTopicId, subTopicId };
    }
}
