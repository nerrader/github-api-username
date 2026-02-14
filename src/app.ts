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
	readonly status: number;
}

interface userData {
	readonly type: string;
	readonly repo: string;
	readonly createdAt: string;
	message: string;
	payload: any;
}

//gets event messages for each event in userdata
type eventType = string;
const messageFormatter: Record<eventType, (event: userData) => string> = {
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
	PublicEvent: (event) => `made ${event.repo} public on ${event.createdAt}`,
	MemberEvent: (event) =>
		`${event.payload.action} ${event.payload.member.login} in ${event.repo} on ${event.createdAt}`,
	GollumEvent: (event) =>
		`updated wiki in ${event.repo} on ${event.createdAt}`,
	DiscussionEvent: (event) =>
		"created " +
		chalk.blue("discussion ") +
		`in ${event.repo} on ${event.createdAt}`,
};

function logErrorMessage(message: string, code: string = "ERROR"): void {
	console.log(chalk.red(`${chalk.bold.red(code.toUpperCase())}: ${message}`));
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
	return `${date}/${month}/${year} ${hours}:${minutes}:${seconds} UTC`;
}

function getEventMessage(event: userData): string {
	//not very cool as it serves a very specific purpose but whatever
	const formatter = messageFormatter[event.type];
	if (formatter) {
		return formatter(event);
	} else {
		logErrorMessage(
			`Couldn't find message for event type ${event.type}, setting message to "unknown"`,
		);
		return "unknown";
	}
}

async function getUserData(username: string) {
	if (username.trim() === "") {
		let error: any = new Error("Username not inputted");
		error.code = "ERROR";
		throw error;
	}

	const response = await fetch(
		`https://api.github.com/users/${username}/events`,
		{
			method: "GET",
			headers: {
				Authorization: `Bearer ${process.env.githubtoken}`,
				"X-GitHub-Api-Version": "2022-11-28",
				"User-Agent": "github api cli app",
			},
		},
	);
	const data: APIData[] = (await response.json()) as APIData[];
	if (!response.ok) {
		const statusResponseMessage: Record<number, string> = {
			400: "BAD REQUEST",
			401: "UNAUTHORIZED, authentication credits missing",
			403: "FORBIDDEN, maybe you exceeded the rate limit?",
			404: "NOT FOUND",
			406: "NOT ACCEPTABLE",
			410: "GONE",
			429: "TOO MANY REQUESTS",
			500: "INTERNAL SERVER ERROR, something happened with the github api itself",
			503: "SERVICE UNAVAILABLE, try again later",
		};
		let error: any = new Error(
			`CODE ${response.status} | ${statusResponseMessage[response.status]}`,
		);
		throw error;
	} else if (typeof data === undefined) {
		let error: any = new Error("APIData is undefined");
		throw error;
	}
	return data;
}

try {
	const APIData = await getUserData(process.argv[2] || "");
	const userData: userData[] = APIData.map((event) => {
		const {
			type,
			repo: { name: repo },
			payload,
		} = event;
		const createdAt = dateToUTC(event.created_at);
		let message: string = "";
		return { type, repo, createdAt, payload, message };
	}).reverse(); // .reverse to make it go from least recent to most recent instead

	console.log(chalk.yellow("OUTPUT:"));
	if (userData.length === 0) {
		//basically means if userdata is empty or not
		console.log(
			chalk.bold.red(
				"This user has not done anything on github recently.",
			),
		);
	} else {
		userData.forEach((event) => (event.message = getEventMessage(event)));
		userData.forEach((event) => console.log(`- ${event.message}`));
	}
} catch (error: any) {
	logErrorMessage(error.message, error.code);
}
console.log(""); //empty line before next command, just for aesthetic
