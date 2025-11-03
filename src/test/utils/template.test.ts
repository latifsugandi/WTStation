import { describe, it, expect } from 'vitest'
import { processTemplate, extractTemplateVariables, validateTemplateVariables } from '../../renderer/src/utils/template'

describe('Template Utils', () => {
  describe('processTemplate', () => {
    it('should replace single variable', () => {
      const content = 'Hello {nama}'
      const variables = { nama: 'John' }
      expect(processTemplate(content, variables)).toBe('Hello John')
    })

    it('should replace multiple variables', () => {
      const content = 'Order {order_id} untuk {nama}'
      const variables = { order_id: '12345', nama: 'John' }
      expect(processTemplate(content, variables)).toBe('Order 12345 untuk John')
    })

    it('should handle missing variables', () => {
      const content = 'Hello {nama}'
      const variables = {}
      expect(processTemplate(content, variables)).toBe('Hello {nama}')
    })
  })

  describe('extractTemplateVariables', () => {
    it('should extract single variable', () => {
      const content = 'Hello {nama}'
      expect(extractTemplateVariables(content)).toEqual(['nama'])
    })

    it('should extract multiple unique variables', () => {
      const content = 'Order {order_id} untuk {nama} dengan {order_id}'
      expect(extractTemplateVariables(content)).toEqual(['order_id', 'nama'])
    })

    it('should return empty array for no variables', () => {
      const content = 'Hello world'
      expect(extractTemplateVariables(content)).toEqual([])
    })
  })

  describe('validateTemplateVariables', () => {
    it('should return empty array when all variables provided', () => {
      const content = 'Hello {nama}'
      const variables = { nama: 'John' }
      expect(validateTemplateVariables(content, variables)).toEqual([])
    })

    it('should return missing variables', () => {
      const content = 'Hello {nama} dengan {order_id}'
      const variables = { nama: 'John' }
      expect(validateTemplateVariables(content, variables)).toEqual(['order_id'])
    })
  })
})
