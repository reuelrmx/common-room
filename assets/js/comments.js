import { config } from "./config.js";
export const commentsApi = {
  async request(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(config.commentsApiBase + path, {
        ...options,
        signal: controller.signal,
        headers: { "Content-Type": "application/json", ...options.headers },
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok)
        throw Error(payload.error || "Discussion is temporarily unavailable.");
      return payload.data;
    } catch (error) {
      if (
        error instanceof SyntaxError ||
        error.name === "AbortError" ||
        error instanceof TypeError
      )
        throw Error("Discussion is temporarily unavailable.");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  },
  list: (id, type) =>
    commentsApi.request(
      `/api/comments?contentId=${encodeURIComponent(id)}&contentType=${encodeURIComponent(type)}`,
    ),
  create: (body) =>
    commentsApi.request("/api/comments", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  report: (id) =>
    commentsApi.request(`/api/comments/${encodeURIComponent(id)}/report`, {
      method: "POST",
      body: "{}",
    }),
};
export async function mountComments(root, item) {
  root.replaceChildren();
  const heading = document.createElement("h2");
  heading.textContent = "Discussion";
  const status = document.createElement("p");
  status.className = "comment-status";
  status.setAttribute("role", "status");
  status.textContent = "Opening the discussion…";
  const list = document.createElement("div");
  root.append(heading, status, list);
  const form = document.createElement("form");
  form.innerHTML =
    '<h3>Leave a thought</h3><p class="meta">Comments are reviewed before appearing. Your display name is public and is not a verified identity.</p><label>Display name<input name="username" required minlength="2" maxlength="40" autocomplete="nickname"></label><label>Your comment<textarea name="body" required minlength="2" maxlength="2000" placeholder="What stayed with you?"></textarea></label><label class="trap" aria-hidden="true">Leave this field empty<input name="website" tabindex="-1" autocomplete="off"></label><p class="reply-status" hidden></p><button type="button" class="cancel-reply" hidden>Cancel reply</button><button type="submit" class="button primary">Post comment</button><p class="form-status" role="status"></p>';
  form.elements.body.maxLength = config.maxCommentLength;
  root.append(form);
  let parentId = null;
  const replyStatus = form.querySelector(".reply-status"),
    cancel = form.querySelector(".cancel-reply"),
    formStatus = form.querySelector(".form-status");
  cancel.addEventListener("click", () => {
    parentId = null;
    replyStatus.hidden = true;
    cancel.hidden = true;
  });
  function renderComment(comment, reply = false) {
    const article = document.createElement("article");
    article.className = "comment" + (reply ? " reply" : "");
    const header = document.createElement("header"),
      name = document.createElement("strong"),
      time = document.createElement("time");
    name.textContent = comment.username;
    const date = new Date(comment.created_at);
    time.dateTime = Number.isNaN(date.getTime()) ? "" : date.toISOString();
    time.textContent = Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
    header.append(name, time);
    const body = document.createElement("p");
    body.textContent = comment.body;
    article.append(header, body);
    if (!reply) {
      const replyButton = document.createElement("button");
      replyButton.textContent = "Reply";
      replyButton.addEventListener("click", () => {
        parentId = comment.id;
        replyStatus.textContent = `Replying to ${comment.username}`;
        replyStatus.hidden = false;
        cancel.hidden = false;
        form.elements.body.focus();
      });
      article.append(replyButton);
    }
    const report = document.createElement("button");
    report.textContent = "Report";
    report.addEventListener("click", async () => {
      report.disabled = true;
      try {
        await commentsApi.report(comment.id);
        report.textContent = "Reported";
      } catch (error) {
        report.disabled = false;
        formStatus.textContent = error.message;
      }
    });
    article.append(report);
    return article;
  }
  async function load() {
    try {
      const comments = await commentsApi.list(item.id, item.category);
      heading.textContent = `Discussion (${comments.length})`;
      status.textContent = comments.length
        ? "Comments from the collection."
        : "No comments yet. Start the discussion.";
      list.replaceChildren();
      const roots = comments.filter((x) => !x.parent_id);
      for (const comment of roots) {
        list.append(renderComment(comment));
        comments
          .filter((x) => x.parent_id === comment.id)
          .forEach((reply) => list.append(renderComment(reply, true)));
      }
      const rootIds = new Set(roots.map((x) => x.id));
      comments
        .filter((x) => x.parent_id && !rootIds.has(x.parent_id))
        .forEach((reply) => list.append(renderComment(reply, true)));
    } catch (error) {
      status.textContent = error.message;
      const retry = document.createElement("button");
      retry.textContent = "Try again";
      retry.addEventListener("click", () => {
        retry.remove();
        load();
      });
      status.append(" ", retry);
    }
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = form.elements.username.value.trim(),
      body = form.elements.body.value.trim();
    if (username.length < 2 || body.length < 2) {
      formStatus.textContent =
        "Please enter a name and a comment of at least two characters.";
      return;
    }
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    formStatus.textContent = "Submitting your comment…";
    try {
      await commentsApi.create({
        content_id: item.id,
        content_type: item.category,
        username,
        body,
        parent_id: parentId,
        website: form.elements.website.value,
      });
      form.elements.body.value = "";
      cancel.click();
      formStatus.textContent =
        "Thank you. Your comment is awaiting moderation.";
    } catch (error) {
      formStatus.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });
  await load();
}
