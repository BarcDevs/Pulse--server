import 'dotenv/config'

import { FORUM_TAGS } from '../../src/constants/forum/tags'
import Prisma from '../../src/utils/prismaClient'

const seedTags = async () => {
    console.info('Seeding tags...')

    for (const tag of FORUM_TAGS) {
        await Prisma.tag.upsert({
            where: { slug: tag.slug },
            update: { name: tag.name, nameHe: tag.nameHe },
            create: tag
        })
    }

    console.info(`Seeded ${FORUM_TAGS.length} tags`)
}

seedTags()
    .catch((e) => {
        console.error(e)
        throw e
    })
    .finally(async () => {
        await Prisma.$disconnect()
    })
