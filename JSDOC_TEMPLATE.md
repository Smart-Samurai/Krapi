# JSDoc Documentation Template

This document provides templates and guidelines for adding JSDoc comments to all code in the KRAPI project.

## General Rules

1. **All exported functions, classes, interfaces, and types MUST have JSDoc comments**
2. **All public methods MUST have JSDoc comments**
3. **All parameters and return types MUST be documented**
4. **Include usage examples for complex functions**
5. **Document all thrown errors**

## Templates

### Class Documentation

```typescript
/**
 * Brief description of the class
 * 
 * More detailed description explaining what the class does,
 * when to use it, and any important implementation details.
 * 
 * @class ClassName
 * @example
 * const instance = new ClassName();
 * await instance.method();
 */
export class ClassName {
  // ...
}
```

### Function/Method Documentation

```typescript
/**
 * Brief description of what the function does
 * 
 * More detailed explanation if needed. Explain the purpose,
 * behavior, and any important side effects.
 * 
 * @param {Type} paramName - Description of the parameter
 * @param {Type} [optionalParam] - Description of optional parameter
 * @returns {ReturnType} Description of what is returned
 * @throws {ErrorType} When this error is thrown and why
 * 
 * @example
 * const result = await functionName(param1, param2);
 * console.log(result);
 */
export async function functionName(
  paramName: Type,
  optionalParam?: Type
): Promise<ReturnType> {
  // ...
}
```

### Interface/Type Documentation

```typescript
/**
 * Brief description of the interface/type
 * 
 * More detailed explanation of what this type represents
 * and when to use it.
 * 
 * @typedef {Object} TypeName
 * @property {string} propertyName - Description of property
 * @property {number} [optionalProperty] - Description of optional property
 * 
 * @example
 * const obj: TypeName = {
 *   propertyName: "value",
 *   optionalProperty: 123
 * };
 */
export interface TypeName {
  propertyName: string;
  optionalProperty?: number;
}
```

### Enum Documentation

```typescript
/**
 * Brief description of the enum
 * 
 * Explanation of what the enum represents and when to use it.
 * 
 * @enum {string}
 * @example
 * const status = StatusEnum.ACTIVE;
 */
export enum StatusEnum {
  /** Description of this value */
  ACTIVE = "active",
  /** Description of this value */
  INACTIVE = "inactive"
}
```

## Common Patterns

### Async Functions

```typescript
/**
 * Async function description
 * 
 * @param {string} id - The ID to look up
 * @returns {Promise<Data>} The data retrieved
 * @throws {NotFoundError} When the ID doesn't exist
 */
async function getData(id: string): Promise<Data> {
  // ...
}
```

### Express Route Handlers

```typescript
/**
 * Handle GET request for resource
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>}
 */
export const getResource = async (
  req: Request,
  res: Response
): Promise<void> => {
  // ...
};
```

### React Components

```typescript
/**
 * Component description
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - The title to display
 * @param {Function} [props.onClick] - Optional click handler
 * @returns {JSX.Element} The rendered component
 * 
 * @example
 * <MyComponent title="Hello" onClick={() => console.log('clicked')} />
 */
export function MyComponent({ title, onClick }: Props): JSX.Element {
  // ...
}
```

### Service Methods

```typescript
/**
 * Create a new resource
 * 
 * @param {CreateRequest} data - The data to create the resource with
 * @returns {Promise<Resource>} The created resource
 * @throws {ValidationError} When the data is invalid
 * @throws {DuplicateError} When a resource with this data already exists
 * 
 * @example
 * const resource = await service.create({
 *   name: "My Resource",
 *   value: 123
 * });
 */
async create(data: CreateRequest): Promise<Resource> {
  // ...
}
```

## Type References

When referencing types, use the full type name:

```typescript
/**
 * @param {BackendProject} project - The project to process
 * @returns {Promise<BackendProjectStats>} Statistics for the project
 */
```

For generic types:

```typescript
/**
 * @param {Array<string>} items - List of items
 * @returns {Promise<Record<string, Data>>} Map of results
 */
```

## Examples

Always include examples for:
- Complex functions
- Functions with multiple parameters
- Functions with non-obvious behavior
- Public API methods

## Error Documentation

Always document what errors can be thrown:

```typescript
/**
 * @throws {ValidationError} When input data is invalid
 * @throws {NotFoundError} When the resource doesn't exist
 * @throws {PermissionError} When user lacks required permissions
 */
```

## Checklist

Before committing, ensure:
- [ ] All exported functions have JSDoc
- [ ] All public methods have JSDoc
- [ ] All parameters are documented
- [ ] Return types are documented
- [ ] Errors are documented
- [ ] Complex functions have examples
- [ ] Types and interfaces are documented
- [ ] Classes are documented
