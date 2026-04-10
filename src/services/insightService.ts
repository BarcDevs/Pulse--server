import logger from '../utils/logger'

import { generateInsightForCheckIn } from './insightGenerationService'

const generateInsightSafely = async (
    userId: string,
    checkInId: string
): Promise<void> => {
    try {
        await generateInsightForCheckIn(
            userId,
            checkInId
        )
    } catch (err) {
        logger.error(
            'Failed to generate insight for check-in',
            {
                userId,
                checkInId,
                error: err instanceof Error
                    ? err.message
                    : 'Unknown error'
            }
        )
    }
}

export { generateInsightSafely }