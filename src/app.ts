// 1. fetch the api data
// 2. remove the useless properties and modify the existing ones
// 3. log it to a readable format

"use strict";
import chalk from "chalk";
import "dotenv/config";

interface APIData {
	readonly type: string;
	repo: {
		readonly name: string;
	};
	payload: any; //problem is every payload is different for every type so
	readonly created_at: string;
	readonly status?: string;
}
interface userData {
	readonly type: string;
	readonly repo: string;
	readonly createdAt: string;
	message: string;
	payload: any;
}
function logErrorMessage(message: string, code: string = "ERROR"): void {
	console.log(chalk.bold.red(`${code.toUpperCase()}:`));
	console.log(chalk.red(message));
}
function dateToUTC(isoString: string): string {
	const now = new Date(isoString);
	const format = (time: string) => time.padStart(2, "0");
	const date = now.getDate();
	const month = now.getMonth() + 1;
	const year = now.getFullYear();
	const seconds = format(String(now.getSeconds()));
	const minutes = format(String(now.getMinutes()));
	const hours = format(String(now.getHours()));
	return `${date}/${month}/${year} ${hours}:${minutes}:${seconds} GMT`;
}
function getEventMessage() {
	type event = userData;
	const messageFormatter: Record<string, (event: event) => string> = {
		CreateEvent: (event) =>
			chalk.green("created ") +
			` a ${event.payload.ref_type} in ${event.repo} on ${event.createdAt}`,
		PushEvent: (event) =>
			chalk.blueBright("pushed ") +
			`a commit in ${event.repo} on ${event.createdAt}`,
		IssuesEvent: (event) =>
			`${event.payload.action} an ` +
			chalk.redBright("issue ") +
			`in ${event.repo} on ${event.createdAt}`,
		IssueCommentEvent: (event) =>
			chalk.blue("commented ") +
			`on an issue in ${event.repo} on ${event.createdAt}`,
		WatchEvent: (event) =>
			chalk.yellow("starred ") + `${event.repo} on ${event.createdAt}`,
		PullRequestEvent: (event) =>
			`${event.payload.action} pull request in ${event.repo} on ${event.createdAt}`,
		PullRequestReviewEvent: (event) =>
			`${event.payload.review.state} pull request #${event.payload.pull_request.number} in ${event.repo} on ${event.createdAt}`,
		PullRequestReviewCommentEvent: (event) =>
			chalk.blue("commented ") +
			`on pull request #${event.payload.pull_request.number} in ${event.repo} on ${event.createdAt}`,
		ReleaseEvent: (event) =>
			`${event.payload.action} release ${event.payload.release.tag_name} in ${event.repo} on ${event.createdAt}`,
		DeleteEvent: (event) =>
			chalk.red("deleted ") +
			`${event.payload.ref_type} in ${event.repo} on ${event.createdAt}`,
		PublicEvent: (event) =>
			`made ${event.repo} public on ${event.createdAt}`,
		MemberEvent: (event) =>
			`${event.payload.action} ${event.payload.member.login} in ${event.repo} on ${event.createdAt}`,
		GollumEvent: (event) =>
			`updated wiki in ${event.repo} on ${event.createdAt}`,
		DiscussionEvent: (event) =>
			"created " +
			chalk.blue("discussion ") +
			`in ${event.repo} on ${event.createdAt}`,
	};
	return userData.forEach((event) => {
		const formatter = messageFormatter[event.type];
		if (formatter) {
			event.message = formatter(event);
		} else {
			logErrorMessage(
				`Couldn't find message for event type ${event.type}, setting message to "unknown"`
			);
			console.log(event); //only for getting new events, remove when done
			event.message = "unknown";
		}
	});
}
async function getUserData() {
	const username = process.argv[2];
	if (typeof username !== "string") {
		logErrorMessage("Username not inputted");
		process.exit(1);
	}
	try {
		const response = await fetch(
			`https://api.github.com/users/${username}/events`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${process.env.githubtoken}`,
					"X-GitHub-Api-Version": "2022-11-28",
					"User-Agent": "github api cli app",
				},
			}
		);
		const data: APIData[] = (await response.json()) as APIData[];
		if (response.status === 404) {
			logErrorMessage(`Username ${username} does not exist.`);
			process.exit(1);
		} else {
			return data;
		}
	} catch (e) {
		logErrorMessage("Something went wrong...");
		console.log(chalk.red(e));
		process.exit(1);
	}
}
const APIData = await getUserData();
if (typeof APIData === "undefined") {
	logErrorMessage("APIData is undefined, something went wrong.");
	process.exit(1);
}

const userData: userData[] = APIData.map((event) => {
	const {
		type,
		repo: { name: repo },
		payload,
	} = event;
	let { created_at: createdAt } = event;
	const message: string = "placeholder";
	createdAt = dateToUTC(createdAt);
	return { type, repo, createdAt, payload, message };
}).reverse();

console.log(chalk.yellow("OUTPUT:"));
getEventMessage();
userData.forEach((event) => console.log(`- ${event.message}`));
