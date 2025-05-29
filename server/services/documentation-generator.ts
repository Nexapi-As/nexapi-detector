import { ApiCall, ApiEndpoint, InsertApiEndpoint, ApiDocumentation } from "@shared/schema";
import { storage } from "../storage";

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description?: string;
    version: string;
  };
  servers: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
}

export class DocumentationGenerator {
  static parseUrl(url: string) {
    try {
      const urlObj = new URL(url);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      const path = urlObj.pathname;
      const searchParams = urlObj.searchParams;
      
      return { baseUrl, path, searchParams };
    } catch {
      return null;
    }
  }

  static inferParameterType(value: string): string {
    if (!isNaN(Number(value))) return 'number';
    if (value === 'true' || value === 'false') return 'boolean';
    if (value.match(/^\d{4}-\d{2}-\d{2}/)) return 'string'; // date format
    return 'string';
  }

  static inferSchemaFromJson(data: any): any {
    if (data === null) return { type: 'null' };
    if (typeof data === 'string') return { type: 'string', example: data };
    if (typeof data === 'number') return { type: 'number', example: data };
    if (typeof data === 'boolean') return { type: 'boolean', example: data };
    if (Array.isArray(data)) {
      return {
        type: 'array',
        items: data.length > 0 ? this.inferSchemaFromJson(data[0]) : { type: 'string' }
      };
    }
    if (typeof data === 'object') {
      const properties: Record<string, any> = {};
      const required: string[] = [];
      
      for (const [key, value] of Object.entries(data)) {
        properties[key] = this.inferSchemaFromJson(value);
        if (value !== null && value !== undefined) {
          required.push(key);
        }
      }
      
      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined
      };
    }
    return { type: 'string' };
  }

  static async analyzeApiCall(apiCall: ApiCall): Promise<InsertApiEndpoint | null> {
    const parsedUrl = this.parseUrl(apiCall.url);
    if (!parsedUrl) return null;

    const { baseUrl, path, searchParams } = parsedUrl;

    // Extract parameters from URL and query string
    const parameters: Array<{
      name: string;
      type: string;
      required: boolean;
      description?: string;
      example?: any;
    }> = [];

    // Path parameters (simplified - looking for :id or {id} patterns)
    const pathParams = path.match(/\/\{([^}]+)\}|\/([a-f0-9-]{20,}|\d+)/g);
    if (pathParams) {
      pathParams.forEach(param => {
        const name = param.startsWith('/{') ? param.slice(2, -1) : 'id';
        parameters.push({
          name,
          type: 'string',
          required: true,
          description: `Path parameter: ${name}`
        });
      });
    }

    // Query parameters
    searchParams.forEach((value, key) => {
      parameters.push({
        name: key,
        type: this.inferParameterType(value),
        required: false,
        example: value,
        description: `Query parameter: ${key}`
      });
    });

    // Request body analysis
    let requestBody = undefined;
    const contentTypeHeader = apiCall.requestHeaders.find(
      h => h.name.toLowerCase() === 'content-type'
    );
    
    if (['POST', 'PUT', 'PATCH'].includes(apiCall.method) && contentTypeHeader) {
      try {
        // For demo purposes, we'll create a basic request body structure
        // In a real implementation, you'd parse the actual request body
        requestBody = {
          contentType: contentTypeHeader.value,
          schema: [{ type: 'object', properties: {} }],
          example: {}
        };
      } catch (error) {
        // Handle parsing errors
      }
    }

    // Response analysis
    const responses: Array<{
      statusCode: number;
      description: string;
      contentType: string;
      schema: any;
      example?: any;
    }> = [];

    if (apiCall.status) {
      const responseContentType = apiCall.responseHeaders.find(
        h => h.name.toLowerCase() === 'content-type'
      )?.value || 'application/json';

      responses.push({
        statusCode: apiCall.status,
        description: this.getStatusDescription(apiCall.status),
        contentType: responseContentType,
        schema: { type: 'object' }
      });
    }

    // Generate summary and description
    const pathSegments = path.split('/').filter(Boolean);
    const resource = pathSegments[pathSegments.length - 1] || 'resource';
    const summary = `${apiCall.method} ${resource}`;
    const description = `${apiCall.method} endpoint for ${path}`;

    // Generate tags from URL structure
    const tags = pathSegments.length > 0 ? [pathSegments[0]] : ['api'];

    return {
      baseUrl,
      path,
      method: apiCall.method,
      summary,
      description,
      parameters,
      requestBody,
      responses,
      tags,
      version: '1.0.0',
      lastSeen: new Date(),
      callCount: 1
    };
  }

  static getStatusDescription(status: number): string {
    const descriptions: Record<number, string> = {
      200: 'Successful response',
      201: 'Created successfully',
      204: 'No content',
      400: 'Bad request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not found',
      500: 'Internal server error'
    };
    
    return descriptions[status] || `HTTP ${status}`;
  }

  static async generateOpenAPISpec(baseUrl: string): Promise<OpenAPISpec> {
    const endpoints = await storage.getApiEndpointsByBaseUrl(baseUrl);
    
    // Group endpoints by path and method
    const paths: Record<string, any> = {};
    const schemas: Record<string, any> = {};
    
    for (const endpoint of endpoints) {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }
      
      const operation = {
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags,
        parameters: endpoint.parameters.map(param => ({
          name: param.name,
          in: param.name.includes('path') ? 'path' : 'query',
          required: param.required,
          schema: { type: param.type },
          description: param.description,
          example: param.example
        })),
        responses: {}
      };

      // Add request body if present
      if (endpoint.requestBody) {
        operation.requestBody = {
          required: true,
          content: {
            [endpoint.requestBody.contentType]: {
              schema: endpoint.requestBody.schema,
              example: endpoint.requestBody.example
            }
          }
        };
      }

      // Add responses
      for (const response of endpoint.responses) {
        operation.responses[response.statusCode] = {
          description: response.description,
          content: {
            [response.contentType]: {
              schema: response.schema,
              example: response.example
            }
          }
        };
      }

      paths[endpoint.path][endpoint.method.toLowerCase()] = operation;
    }

    const urlObj = new URL(baseUrl);
    const title = `${urlObj.hostname} API`;
    
    return {
      openapi: '3.0.3',
      info: {
        title,
        description: `Auto-generated API documentation for ${baseUrl}`,
        version: '1.0.0'
      },
      servers: [
        {
          url: baseUrl,
          description: 'Production server'
        }
      ],
      paths,
      components: {
        schemas,
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer'
          },
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key'
          }
        }
      }
    };
  }

  static async updateDocumentation(apiCall: ApiCall): Promise<void> {
    try {
      const endpointData = await this.analyzeApiCall(apiCall);
      if (!endpointData) return;

      await storage.upsertApiEndpoint(endpointData);
      
      // Regenerate documentation for this base URL
      const openApiSpec = await this.generateOpenAPISpec(endpointData.baseUrl);
      
      await storage.upsertApiDocumentation({
        title: openApiSpec.info.title,
        description: openApiSpec.info.description,
        version: openApiSpec.info.version,
        baseUrl: endpointData.baseUrl,
        openApiSpec
      });
    } catch (error) {
      console.error('Error updating documentation:', error);
    }
  }
}