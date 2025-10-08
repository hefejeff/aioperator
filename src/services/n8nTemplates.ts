export const AI_ANALYSIS_NODE_TEMPLATE = {
  parameters: {
    authentication: "none",
    url: "={{$env.AI_API_URL || 'https://api.openai.com/v1/chat/completions'}}",
    options: {
      allowUnauthorizedCerts: false,
      jsonParameters: true
    },
    headerParametersUi: {
      parameter: [
        {
          name: "Authorization",
          value: "Bearer {{$env.OPENAI_API_KEY}}"
        },
        {
          name: "Content-Type",
          value: "application/json"
        }
      ]
    },
    bodyParametersJson: {
      model: "{{$env.AI_MODEL || 'gpt-4-turbo'}}",
      messages: [
        {
          role: "system",
          content: "You assist in workflow automation. Given input data, analyze and provide suggestions in a structured JSON response."
        },
        {
          role: "user",
          content: "{{$json.input}}"
        }
      ],
      temperature: 0.7
    }
  }
};

export const WEBHOOK_INPUT_NODE_TEMPLATE = {
  parameters: {
    path: "workflow/input",
    httpMethod: "POST",
    options: {
      responseMode: "lastNode",
      responseData: "json"
    },
    authentication: "none"
  }
};

export const HUMAN_APPROVAL_NODE_TEMPLATE = {
  parameters: {
    path: "workflow/human-approval",
    httpMethod: "POST",
    options: {
      responseMode: "lastNode",
      responseData: "json"
    },
    authentication: "none"
  }
};

export const PROCESS_DATA_FUNCTION_TEMPLATE = {
  parameters: {
    functionCode: "// Input data is available in $input\nconst items = $input.all();\nconst results = items.map(item => {\n  // Process each item\n  return {\n    ...item.json,\n    processed: true,\n    timestamp: new Date().toISOString()\n  };\n});\n\nreturn results;"
  }
};

export const ERROR_HANDLING_FUNCTION_TEMPLATE = {
  parameters: {
    functionCode: "// Error handling wrapper\ntry {\n  const items = $input.all();\n  // Process items\n  return items;\n} catch (error) {\n  // Log error and return error response\n  console.error('Workflow error:', error);\n  return [{ json: { \n    error: true, \n    message: error.message,\n    timestamp: new Date().toISOString()\n  }}];\n}"
  }
};

export const API_RESPONSE_TEMPLATE = {
  parameters: {
    keepOnlySet: true,
    options: {},
    responseCode: "={{$json.statusCode || 200}}",
    responseData: "={{$json.data || { success: true }}}"
  }
};

export const DATA_TRANSFORM_FUNCTION_TEMPLATE = {
  parameters: {
    functionCode: "// Transform data between steps\nconst inputData = $input.first().json;\n\nreturn [{\n  json: {\n    // Add your transformation logic here\n    ...inputData,\n    transformed: true\n  }\n}];"
  }
};

export const IF_CONDITION_NODE_TEMPLATE = {
  parameters: {
    conditions: {
      boolean: [
        {
          value1: "={{$json.someCondition}}",
          value2: true
        }
      ],
      combinator: "AND",
      mode: "allMatch"
    }
  }
};

export const NOTIFICATION_NODE_TEMPLATE = {
  parameters: {
    url: "={{$env.NOTIFICATION_WEBHOOK_URL}}",
    headerParametersUi: {
      parameter: [
        {
          name: "Content-Type",
          value: "application/json"
        }
      ]
    },
    options: {
      jsonParameters: true
    },
    bodyParametersJson: {
      message: "={{$json.notificationMessage}}",
      timestamp: "={{$now}}",
      workflowId: "={{$workflow.id}}",
      executionId: "={{$execution.id}}"
    }
  }
};

export const SET_NODE_TEMPLATE = {
  parameters: {
    values: {
      boolean: [],
      number: [
        {
          name: "statusCode",
          value: 200
        }
      ],
      string: [
        {
          name: "status",
          value: "success"
        }
      ]
    },
    options: {}
  }
};