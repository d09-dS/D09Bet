const fs = require("fs");
const path = require("path");

const WORKFLOWS_DIR = path.join(__dirname, "..", "workflows");
const SKILLS_DIR = path.join(__dirname, "..", "..", ".devin", "skills");

function getWorkflows() {
  const workflows = [];
  const files = fs.readdirSync(WORKFLOWS_DIR).filter(f =>
    f.endsWith(".md") &&
    !f.startsWith("project-init-generate") &&
    !f.startsWith("project-init-enhance") &&
    !f.startsWith("project-init-quality")
  );
  for (const file of files) {
    const content = fs.readFileSync(path.join(WORKFLOWS_DIR, file), "utf8");
    const nameMatch = file.replace(".md", "");
    const descMatch = content.match(/^description:\s*(.+)$/m);
    const description = descMatch ? descMatch[1].trim() : `Run the ${nameMatch} workflow`;
    workflows.push({ name: nameMatch, description, file });
  }
  return workflows;
}

function getWorkflowContent(name) {
  const filePath = path.join(WORKFLOWS_DIR, `${name}.md`);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf8");

  let skillContent = null;
  const skillPath = path.join(SKILLS_DIR, name, "SKILL.md");
  if (fs.existsSync(skillPath)) {
    skillContent = fs.readFileSync(skillPath, "utf8");
  }

  return { workflow: content, skill: skillContent };
}

function buildToolsList() {
  const workflows = getWorkflows();
  return workflows.map(w => ({
    name: w.name,
    description: w.description,
    inputSchema: {
      type: "object",
      properties: {
        scope: {
          type: "string",
          description: "Optional scope or target for the workflow (e.g. file path, module name, 'full' for entire project)"
        }
      }
    }
  }));
}

function handleToolCall(name, args) {
  const data = getWorkflowContent(name);
  if (!data) {
    return { isError: true, content: [{ type: "text", text: `Workflow '${name}' not found.` }] };
  }

  const scope = args && args.scope ? `\n\nScope: ${args.scope}` : "";
  const instructions = data.skill
    ? `# Workflow Instructions (from Devin Skill)\n\n${data.skill}\n\n---\n\n# Full Workflow Definition\n\n${data.workflow}`
    : data.workflow;

  return {
    content: [{
      type: "text",
      text: `Execute the following workflow step by step.${scope}\n\n${instructions}`
    }]
  };
}

function sendResponse(id, result) {
  const response = JSON.stringify({ jsonrpc: "2.0", id, result });
  process.stdout.write(`Content-Length: ${Buffer.byteLength(response)}\r\n\r\n${response}`);
}

function sendError(id, code, message) {
  const response = JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } });
  process.stdout.write(`Content-Length: ${Buffer.byteLength(response)}\r\n\r\n${response}`);
}

function handleMessage(msg) {
  const { id, method, params } = msg;

  switch (method) {
    case "initialize":
      sendResponse(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "workflow-server", version: "1.0.0" }
      });
      break;

    case "notifications/initialized":
      break;

    case "tools/list":
      sendResponse(id, { tools: buildToolsList() });
      break;

    case "tools/call": {
      const result = handleToolCall(params.name, params.arguments || {});
      sendResponse(id, result);
      break;
    }

    case "ping":
      sendResponse(id, {});
      break;

    default:
      if (id) sendError(id, -32601, `Method not found: ${method}`);
      break;
  }
}

let buffer = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;

  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) break;

    const header = buffer.substring(0, headerEnd);
    const lengthMatch = header.match(/Content-Length:\s*(\d+)/i);
    if (!lengthMatch) {
      buffer = buffer.substring(headerEnd + 4);
      continue;
    }

    const contentLength = parseInt(lengthMatch[1], 10);
    const contentStart = headerEnd + 4;

    if (buffer.length < contentStart + contentLength) break;

    const content = buffer.substring(contentStart, contentStart + contentLength);
    buffer = buffer.substring(contentStart + contentLength);

    try {
      const msg = JSON.parse(content);
      handleMessage(msg);
    } catch (err) {
      process.stderr.write(`[workflow-server] Parse error: ${err.message}\n`);
    }
  }
});

process.stderr.write("[workflow-server] MCP Workflow Server started (stdio)\n");
