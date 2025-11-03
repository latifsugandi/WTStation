export interface TemplateVariable {
  [key: string]: string | number | Date
}

/**
 * Replace template variables in content
 * @param content Template content with {variable} placeholders
 * @param variables Object with variable values
 * @returns Processed content with variables replaced
 */
export function processTemplate(content: string, variables: TemplateVariable): string {
  let processed = content
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g')
    const stringValue = value instanceof Date ? value.toLocaleDateString() : String(value)
    processed = processed.replace(regex, stringValue)
  })
  
  return processed
}

/**
 * Extract variable names from template content
 * @param content Template content
 * @returns Array of variable names
 */
export function extractTemplateVariables(content: string): string[] {
  const matches = content.match(/\{(\w+)\}/g)
  if (!matches) return []
  
  const variables = matches.map((match) => match.slice(1, -1))
  return [...new Set(variables)]
}

/**
 * Validate template variables
 * @param content Template content
 * @param variables Provided variables
 * @returns Array of missing variables
 */
export function validateTemplateVariables(
  content: string,
  variables: TemplateVariable
): string[] {
  const required = extractTemplateVariables(content)
  const provided = Object.keys(variables)
  return required.filter((v) => !provided.includes(v))
}
