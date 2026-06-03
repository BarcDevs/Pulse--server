import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { databaseConfig, isDev } from '../../config'
import { PrismaClient } from '../generated/prisma/client'

const connectionString = databaseConfig.url
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({
	adapter,
	errorFormat: 'minimal',
	log: isDev ? ['query', 'info', 'warn', 'error'] : undefined
})

const commentTemplates = [
	'This is exactly what I needed to read today. Thank you for sharing.',
	'I had a similar experience — the consistency really does matter more than intensity.',
	'Really appreciate the specific details here, not just vague advice.',
	'Sharing this with my care team. This is really helpful.',
	'Week 8 was my hardest too. You described it perfectly.',
	'Thank you for being so honest about the hard parts.',
	'This community is why I keep coming back. Great post.',
	'I tried this approach and it genuinely helped me too.',
	'How long did it take before you saw improvements?',
	'This resonates with my own journey. Keep sharing.',
	'Your timing with this post is incredible. I needed this today.',
	'The breakdown you provided is exactly what I was looking for.',
	'Can you elaborate on the second point? That really caught my attention.',
	'I wish I had found this three months ago. Game changer.',
	'This gives me hope. Thank you for documenting your journey.',
	'Saving this for my morning reading when I need a boost.',
	'The part about grief really hit home for me.',
	'How often are you doing these exercises now?',
	'My therapist is going to love this perspective.',
	'This is the kind of post that should be pinned.',
	'Been following your journey — glad to see you sharing more.',
	'The honesty here is refreshing. Most posts sanitize the struggle.',
	'Question: did you experience any setbacks during this period?',
	'This approach is so different from what I was trying. Trying it now.',
	'The consistency part rings true. That was my turning point too.',
	'For anyone skeptical — I tried this and can confirm it works.',
	'This deserves way more engagement. Bumping for visibility.',
	'My PT said almost exactly this last week. Validation feels good.',
	'What was the hardest part of staying consistent?',
	'The emotional aspect gets overlooked so much. Thank you for naming it.',
	'I am going to try your morning routine starting tomorrow.',
	'This is helping me feel less alone in the process.',
	'Can you share which resources helped you most?',
	'The part about comparing only to yourself — that is gold.',
	'Bookmarking this. My recovery is at a similar stage.',
	'Your honesty about the mental health part is important.',
	'This should be required reading for anyone starting recovery.',
	'How did you stay motivated on the really hard days?',
	'The specificity here is what makes this valuable.',
	'Thank you for the encouragement. I needed this today.',
	'Your framing of setbacks as information, not failure, changed perspective.',
	'This community recommendation did not disappoint.',
	'The practical steps at the end are so actionable.',
	'I am saving this to reread during my harder days.',
	'Your journey is inspiring but what I appreciate most is the realism.',
	'Can you recommend resources for the mental health part?',
	'This is the kind of detailed experience sharing that actually helps.',
	'My family is reading this too. So much applies to everyone.',
	'The timeline you shared gives me realistic expectations.',
	'This validates what my care team has been saying.',
	'Looking forward to your next post. You have a gift for explaining this.',
	'The grief section needs to be its own post. So important.',
	'Thank you for the reminder that progress is not linear.',
	'This is going in my recovery toolkit. Seriously helpful.',
	'Your vulnerability here is a gift to everyone reading.',
	'The specific exercises and timeline make this believable.',
	'I tried something similar and got similar results. You are onto something.',
	'This gives me permission to acknowledge my own struggle.',
	'How long until you felt like yourself again?',
	'The consistency part cannot be overstated. That is the whole game.',
	'This is what community support actually looks like.',
	'I am going to share this with someone who is just starting.',
	'The honesty about the anxiety is so refreshing.',
	'Your approach to pacing is exactly what I needed to hear.',
	'This is bookmark-worthy. Thank you for taking the time to write it.',
	'The practical breakdown makes this so much more useful.',
	'I feel seen reading this. Thank you.',
	'The part about tiny wins is exactly my strategy too.',
	'Can you do a follow-up on what happened next?',
	'This deserves to be shared far beyond this forum.',
	'Your framework is something I am going to use going forward.',
	'The emotional piece is what separates this from generic advice.',
	'Thank you for being specific about timelines.',
	'This is the kind of post I wish I had found months ago.',
	'Your honesty about setbacks makes this credible and helpful.',
	'I am already implementing this. Results in a few weeks, I hope.',
	'The community here is special. Posts like this why.',
	'This should be in every recovery guide ever written.',
	'Your experience is validating me so much right now.',
	'The details about struggle are what make this resonate.',
	'Can I ask one follow-up question about the second technique?',
	'This post is going to help so many people. Thank you.',
	'The timeline in your story gave me hope for my own.',
	'Saving this for the hard days. Bookmarking now.',
	'Your journey mirrors mine so closely it is uncanny.',
	'The part about identity loss really got me.',
	'This is the support and information I have been looking for.',
	'Thank you for the concrete, practical advice.',
	'The honesty here is exactly what the community needs.',
	'I am so glad you shared this. Sending gratitude.',
	'Your breakdown of the process is crystal clear.',
	'This validated everything my therapist has been saying.',
	'Can you elaborate on how you handled the emotional part?',
	'This post is a masterclass in recovery documentation.',
	'The vulnerability makes this so much more powerful.',
	'I am rereading this three times. So much value here.',
	'Your story is giving me the push I needed today.',
	'The practical tips combined with honesty is the sweet spot.',
	'This is exactly the kind of content that keeps me in this community.',
	'Thank you for the detailed timeline. That helps so much.',
	'Your approach to setbacks is something I am adopting.',
	'This deserves all the engagement. Bumping hard.',
	'The specificity about exercises is so helpful.',
	'I am telling everyone in my support group about this post.',
	'Your framing of the journey is exactly what I needed to hear.'
]

async function main() {
	try {
		console.info('Fetching users for comments...')
		const users = await prisma.user.findMany({
			include: { profile: true },
			take: 10
		})

		if (users.length === 0) {
			console.error('No users found. Run main seed first.')
			process.exit(1)
		}

		console.info(`Found ${users.length} users`)

		const categories = ['recovery', 'therapy', 'mental', 'milestones', 'lifestyle', 'support', 'questions', 'discussion', 'wellness']
		const commentCounts = [5, 8, 12, 15, 20, 25, 30, 40, 50, 75, 100]

		const postsToCreate = [
			{
				title: 'Recovery at different paces — my 18-month journey',
				body: '<p>Wanted to share my recovery story in case it helps anyone on their own path. Recovery looks different for everyone, and I wish I had known that earlier.</p>',
				commentCount: 20,
				likeCount: 45
			},
			{
				title: 'Physical therapy breakthroughs — what finally worked for me',
				body: '<p>After struggling for months with my PT routine, something clicked around week 12. Here is what made the difference in my recovery.</p>',
				commentCount: 50,
				likeCount: 87
			},
			{
				title: 'Real talk about the mental side of physical recovery',
				body: '<p>Nobody talks about the mental health challenges that come with physical recovery. I want to open that conversation because it is real and it matters.</p>',
				commentCount: 100,
				likeCount: 156
			},
			{
				title: 'My morning routine saved my recovery',
				body: '<p>Simple but consistent — 10 minutes of stretching and journaling every morning changed everything for me.</p>',
				commentCount: 12,
				likeCount: 34
			},
			{
				title: 'When progress feels invisible',
				body: '<p>Week 4 felt exactly like week 2. Then week 6 was completely different. Hang in there.</p>',
				commentCount: 25,
				likeCount: 92
			},
			{
				title: 'Nutrition changes that reduced my inflammation',
				body: '<p>I am not a nutritionist but I tracked everything and these five changes made measurable differences in my markers.</p>',
				commentCount: 35,
				likeCount: 78
			},
			{
				title: 'Managing fatigue during physical therapy',
				body: '<p>The three types of fatigue nobody explains and how my therapist helped me understand each one.</p>',
				commentCount: 15,
				likeCount: 51
			},
			{
				title: 'Talking to my kids about my recovery',
				body: '<p>Age-appropriate honesty and giving them a role made a huge difference for our whole family.</p>',
				commentCount: 8,
				likeCount: 67
			},
			{
				title: 'Rebuilding confidence after losing function',
				body: '<p>I had to accept that the goal was not returning to what I was. It was finding what I could become.</p>',
				commentCount: 42,
				likeCount: 123
			},
			{
				title: 'What does pacing actually mean in practice?',
				body: '<p>Every resource mentions pacing but almost none explain what it looks like daily. Let is discuss concrete approaches.</p>',
				commentCount: 18,
				likeCount: 56
			}
		]

		for (const postData of postsToCreate) {
			const authorIdx = Math.floor(Math.random() * users.length)
			const author = users[authorIdx]!
			const categoryIdx = Math.floor(Math.random() * categories.length)
			const category = categories[categoryIdx]!

			console.info(`Creating post: "${postData.title}"`)
			console.info(`  Category: ${category} | Comments: ${postData.commentCount} | Likes: ${postData.likeCount}`)

			const post = await prisma.post.create({
				data: {
					title: postData.title,
					body: postData.body,
					authorId: author.profile!.id,
					category
				}
			})

			// Add likes to post (max one per user)
			const maxLikes = Math.min(postData.likeCount, users.length)
			const likerIndices = new Set<number>()
			while (likerIndices.size < maxLikes) {
				likerIndices.add(Math.floor(Math.random() * users.length))
			}

			for (const likerIdx of likerIndices) {
				const liker = users[likerIdx]!
				try {
					await prisma.postLike.upsert({
						where: {
							profileId_postId: {
								postId: post.id,
								profileId: liker.profile!.id
							}
						},
						update: {},
						create: {
							postId: post.id,
							profileId: liker.profile!.id
						}
					})
				} catch (e) {
					// Skip if fails
				}
			}

			console.info(`  Added ${postData.likeCount} likes`)

			// Add comments
			for (let i = 0; i < postData.commentCount; i++) {
				const commenter = users[i % users.length]!
				const template = commentTemplates[i % commentTemplates.length]!

				const reply = await prisma.reply.create({
					data: {
						body: template,
						authorId: commenter.profile!.id,
						postId: post.id
					}
				})

				// Add random likes to replies (0-3 per comment, max one per user)
				const replyLikeCount = Math.floor(Math.random() * 4)
				const replyLikerIndices = new Set<number>()
				while (replyLikerIndices.size < Math.min(replyLikeCount, users.length)) {
					replyLikerIndices.add(Math.floor(Math.random() * users.length))
				}

				for (const likerIdx of replyLikerIndices) {
					const liker = users[likerIdx]!
					try {
						await prisma.replyLike.upsert({
							where: {
								profileId_replyId: {
									replyId: reply.id,
									profileId: liker.profile!.id
								}
							},
							update: {},
							create: {
								replyId: reply.id,
								profileId: liker.profile!.id
							}
						})
					} catch {
						// Skip if fails
					}
				}

				if ((i + 1) % 20 === 0) {
					console.info(`  Added ${i + 1}/${postData.commentCount} comments`)
				}
			}

			console.info(`✓ Post complete\n`)
		}

		console.info('✓ Seed complete — 10 posts with varied comments, likes, and categories')
	} catch (e) {
		console.error('Seed failed:', e)
		throw e
	} finally {
		await prisma.$disconnect()
	}
}

main()
