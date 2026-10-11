import { getMessages } from '../locales'

// Check-ins store activities as English slugs ('walking'); prompts need the
// user's language so the model does not leave the slug in English or translate
// it with its own article. Custom activities typed by the user pass through.
export const localizeActivity = (
    activity: string,
    language?: string | null
): string => {
    const labels = getMessages(language).activities
    const slug = activity.trim().toLowerCase()

    return Object.hasOwn(labels, slug)
        ? labels[slug]
        : activity
}
