# Getting Started Guide
## AI Operator Training Hub - Complete Walkthrough

---

## Table of Contents

1. [Creating Your Account](#1-creating-your-account)
2. [Logging In](#2-logging-in)
3. [Your First Company Research](#3-your-first-company-research)
4. [Finding AI Opportunities](#4-finding-ai-opportunities)
5. [Understanding Suggested Scenarios](#5-understanding-suggested-scenarios)
6. [Running Your First Scenarios](#6-running-your-first-scenarios)
7. [Understanding Scenario Results](#7-understanding-scenario-results)
8. [Company Outputs & Deliverables](#8-company-outputs--deliverables)
9. [Tips for Success](#9-tips-for-success)

---

## 1. Creating Your Account

### Step-by-Step Sign Up

1. **Navigate to the Application**
   - Open your browser and go to [https://ai-operator-pro.web.app](https://ai-operator-pro.web.app)

2. **Click "Sign Up"**
   - On the welcome screen, click the **Sign Up** button or toggle to the sign-up form

3. **Enter Your Information**
   - **Display Name**: Enter your full name (this will be shown on leaderboards and evaluations)
   - **Email**: Use your work email address
   - **Password**: Create a strong password (minimum 6 characters)

4. **Complete Registration**
   - Click **Create Account**
   - You'll be automatically logged in and directed to the home screen

> 💡 **Tip**: Use a memorable display name—it appears on your saved work and evaluation results.

---

## 2. Logging In

### Standard Login

1. **Go to the Application**
   - Visit [https://ai-operator-pro.web.app](https://ai-operator-pro.web.app)

2. **Enter Credentials**
   - **Email**: Your registered email address
   - **Password**: Your account password

3. **Click "Sign In"**
   - You'll be directed to the home dashboard

### Troubleshooting Login Issues

| Problem | Solution |
|---------|----------|
| Forgot password | Use the password reset link (if available) or contact your administrator |
| "User not found" error | Verify you're using the correct email or sign up for a new account |
| "Wrong password" error | Double-check your password; it's case-sensitive |

---

## 3. Your First Company Research

Company Research is the starting point for identifying AI automation opportunities for a specific organization.

### Starting New Research

1. **Navigate to Company Research**
   - From the home screen, click **Company Research** in the navigation menu
   - Or click the **Research** icon in the sidebar

2. **Enter the Company Name**
   - In the search field, type the full company name (e.g., "Acme Corporation")
   - Be specific—include "Inc.", "LLC", or other designators if known

3. **Click "Research Company"**
   - The AI will gather publicly available information about the company
   - This typically takes 15-30 seconds

### What the Research Returns

The AI-powered research generates a comprehensive company profile including:

| Section | Description |
|---------|-------------|
| **Company Overview** | Basic information, industry, size, and headquarters |
| **Business Model** | How the company generates revenue |
| **Key Products/Services** | Main offerings and market positioning |
| **Technology Stack** | Known technologies and platforms in use |
| **Recent News** | Latest announcements, partnerships, or changes |
| **Potential Pain Points** | Common challenges based on industry and size |
| **AI/Automation Maturity** | Current level of automation adoption |

### Saving Your Research

- Research is automatically saved to your account
- Access previous research from the **Research List** view
- Each company gets a unique profile you can return to anytime

---

## 4. Finding AI Opportunities

After completing company research, you can identify specific AI automation opportunities.

### Generating Opportunities

1. **View Your Company Research**
   - Open the company profile you researched

2. **Click "Find Opportunities"**
   - Located in the AI Actions panel
   - The system analyzes the company profile against known automation patterns

3. **Review the Results**
   - Opportunities are ranked by potential impact and feasibility
   - Each opportunity includes:
     - **Opportunity Name**: Short description of the automation
     - **Relevance Score**: How well it matches the company's profile (0-100)
     - **Relevance Reason**: Why this opportunity is a good fit
     - **Suggested Approach**: High-level implementation strategy

### Understanding Opportunity Scores

| Score Range | Meaning |
|-------------|---------|
| 80-100 | Excellent fit—high-priority opportunity |
| 60-79 | Good fit—worth exploring |
| 40-59 | Moderate fit—may need customization |
| Below 40 | Lower relevance—consider alternatives |

### Selecting Opportunities

1. **Check the Boxes** next to opportunities you want to pursue
2. Selected opportunities appear in the **Scenarios Sidebar**
3. These become the basis for your training scenarios

---

## 5. Understanding Suggested Scenarios

Scenarios are structured training exercises that help you design AI workflows for specific business problems.

### How Scenarios Are Suggested

The system suggests scenarios based on:
- The company's industry and size
- Identified pain points from research
- Technology stack compatibility
- Common automation patterns for similar companies

### Scenario Components

Each scenario includes:

| Component | Description |
|-----------|-------------|
| **Title** | Brief name for the automation use case |
| **Domain** | Business area (HR, Finance, Operations, etc.) |
| **Problem Statement** | The business challenge to solve |
| **Goal** | The desired outcome of the automation |
| **Platform** | Target technology (Microsoft 365, Google Workspace, Custom) |

### Adding Custom Scenarios

If the suggested scenarios don't fully match your needs:

1. Click **"Create Scenario"** in the sidebar
2. Fill in the scenario details:
   - Select or enter a domain
   - Describe the problem
   - Define the goal
   - Choose the target platform
3. Click **Save**
4. Your custom scenario is now available for training

---

## 6. Running Your First Scenarios

Now it's time to practice designing AI workflows by running scenarios.

### Starting a Scenario

1. **Select a Scenario**
   - Click on any scenario card in your list
   - Or select from the Scenarios Sidebar in Company Research

2. **Open the Operator Console**
   - You'll see the scenario details at the top
   - The main workspace is the **Workflow Editor**

### Writing Your Workflow

1. **Understand the Problem**
   - Read the scenario's problem statement and goal carefully

2. **Design Your Solution**
   - In the Workflow Editor, write step-by-step instructions
   - Describe how AI and humans work together to solve the problem

3. **Best Practices for Workflows**
   ```
   1. [Actor] performs [action] to [achieve purpose]
   2. AI analyzes [input] and generates [output]
   3. Human reviews [output] and approves/modifies
   4. System updates [target] with final result
   ```

### Example Workflow

**Scenario**: Automate customer support ticket triage

```
1. Customer submits support ticket via email or web form
2. AI reads ticket content and classifies by category (billing, technical, general)
3. AI assigns priority level (high, medium, low) based on keywords and sentiment
4. System routes ticket to appropriate team queue
5. Support agent receives pre-categorized ticket with AI-suggested response
6. Agent reviews, edits if needed, and sends response
7. System logs resolution time and customer satisfaction score
```

### Running the Evaluation

1. **Click "Evaluate"** in the AI Actions panel
2. The AI reviews your workflow and provides:
   - **Score** (0-100)
   - **Feedback** on strengths and areas for improvement
   - **Suggestions** for enhancements

3. **Iterate and Improve**
   - Refine your workflow based on feedback
   - Re-run evaluation to improve your score
   - Aim for scores above 80 for production-ready workflows

---

## 7. Understanding Scenario Results

After running scenarios, you'll have several outputs to understand and use.

### Evaluation Results

| Metric | Description |
|--------|-------------|
| **Overall Score** | Composite rating of your workflow (0-100) |
| **Completeness** | Does the workflow cover all necessary steps? |
| **Clarity** | Are the instructions clear and unambiguous? |
| **AI/Human Balance** | Is there appropriate division of tasks? |
| **Feasibility** | Can this be implemented with current technology? |

### Interpreting Feedback

The AI evaluator provides specific feedback in several categories:

**Strengths**: What you did well
- Clear step definitions
- Good use of AI capabilities
- Appropriate human checkpoints

**Areas for Improvement**: What to enhance
- Missing error handling
- Unclear decision points
- Over-reliance on AI or humans

**Suggestions**: Specific recommendations
- Add a validation step after step 3
- Consider fallback for AI failures
- Include notification triggers

### Score Benchmarks

| Score | Level | Meaning |
|-------|-------|---------|
| 90-100 | Expert | Production-ready, comprehensive workflow |
| 80-89 | Proficient | Solid workflow, minor refinements needed |
| 70-79 | Competent | Good foundation, some gaps to address |
| 60-69 | Developing | Core concepts present, needs expansion |
| Below 60 | Needs Work | Significant revisions required |

### Saving Your Results

- **Evaluations are auto-saved** after completion
- Access past evaluations in the **History** view
- Each evaluation creates a **Workflow Version** snapshot

---

## 8. Company Outputs & Deliverables

After running scenarios for a company, you can generate professional deliverables.

### Available Outputs

#### 1. Workflow Diagram
- Visual flowchart of your automation
- Generated from your workflow steps
- Exportable as PNG or SVG

#### 2. Product Requirements Document (PRD)
- Detailed technical specification
- Includes scope, requirements, risks, and metrics
- Tailored to your selected platform

**To Generate a PRD:**
1. Complete a workflow with evaluation
2. Click **"PRD"** in the AI Actions panel
3. Review and edit the generated document
4. Save or download as Markdown

#### 3. Elevator Pitch
- Concise value proposition
- Perfect for stakeholder presentations
- Customized to company context

**To Generate a Pitch:**
1. Have a completed, evaluated workflow
2. Click **"Pitch"** in the AI Actions panel
3. Edit as needed
4. Save for future reference

#### 4. Gen AI Prompt
- Structured prompt for AI assistants
- Use with ChatGPT, Claude, or other AI tools
- Captures all context from your research and scenarios

### Scenario Runs Summary

For each company, you can view all scenario runs:

| Column | Description |
|--------|-------------|
| **Scenario** | Name of the training scenario |
| **Score** | Evaluation score achieved |
| **Date** | When the scenario was completed |
| **Version** | Workflow version snapshot |

### Creating Presentations

1. **Select Completed Scenario Runs**
   - Check the boxes next to runs you want to include

2. **Click "Create Presentation"**
   - Generates a comprehensive slide deck or webpage
   - Includes company research, opportunities, and workflow details

3. **Export or Share**
   - Download for offline use
   - Share link with stakeholders

---

## 9. Tips for Success

### Writing Effective Workflows

✅ **Do:**
- Start each step with an actor (AI, System, Human, Manager)
- Include clear inputs and outputs for each step
- Define decision points and branches
- Consider error scenarios and fallbacks
- End with measurable outcomes

❌ **Don't:**
- Write vague or ambiguous steps
- Assume technical knowledge
- Skip human oversight for critical decisions
- Ignore edge cases

### Maximizing Your Evaluation Scores

1. **Be Comprehensive**: Cover the entire process from start to finish
2. **Balance AI and Humans**: Use AI for repetitive tasks, humans for judgment
3. **Add Checkpoints**: Include validation and approval steps
4. **Consider Scale**: Design for growth and varying volumes
5. **Include Metrics**: Define how success will be measured

### Building Your Skills

| Week | Focus Area |
|------|------------|
| 1 | Complete 3-5 basic scenarios in your domain |
| 2 | Achieve scores above 75 on all attempts |
| 3 | Create custom scenarios for real client needs |
| 4 | Generate PRDs and Pitches for complete deliverables |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save current work |
| `Ctrl/Cmd + Enter` | Run evaluation |
| `Esc` | Close modal dialogs |

---

## Need Help?

If you encounter issues:

1. **Refresh the page** to clear temporary errors
2. **Check your internet connection** for API timeouts
3. **Sign out and back in** if session expires
4. **Contact support** with scenario name and timestamp

---

_Last updated: December 2024_
