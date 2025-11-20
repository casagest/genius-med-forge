/**
 * Unit Tests for Validation Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  validateJSON,
  validateFormInput,
  PatientDataSchema,
  MedicalAIInputSchema,
  MaterialDataSchema,
  sanitizeString,
  safeParseInt,
  safeParseFloat,
} from '../validation';

describe('Validation Utilities', () => {
  describe('sanitizeString', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = sanitizeString(input);
      expect(result).toBe('Hello  World');
      expect(result).not.toContain('<script>');
    });

    it('should remove HTML tags', () => {
      const input = 'Hello <div>World</div>';
      const result = sanitizeString(input);
      expect(result).toBe('Hello World');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = sanitizeString(input);
      expect(result).toBe('Hello World');
    });
  });

  describe('safeParseInt', () => {
    it('should parse valid integer strings', () => {
      expect(safeParseInt('123')).toBe(123);
      expect(safeParseInt('0')).toBe(0);
      expect(safeParseInt('-456')).toBe(-456);
    });

    it('should return default value for invalid input', () => {
      expect(safeParseInt('abc')).toBe(0);
      expect(safeParseInt('abc', 10)).toBe(10);
    });

    it('should handle number input', () => {
      expect(safeParseInt(123)).toBe(123);
    });
  });

  describe('safeParseFloat', () => {
    it('should parse valid float strings', () => {
      expect(safeParseFloat('123.45')).toBe(123.45);
      expect(safeParseFloat('0.5')).toBe(0.5);
    });

    it('should return default value for invalid input', () => {
      expect(safeParseFloat('abc')).toBe(0);
      expect(safeParseFloat('abc', 5.5)).toBe(5.5);
    });
  });

  describe('PatientDataSchema', () => {
    it('should validate correct patient data', () => {
      const validData = {
        patient_code: 'P001',
        first_name: 'John',
        last_name: 'Doe',
        consent_vocal: false,
      };

      const result = PatientDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid patient code', () => {
      const invalidData = {
        patient_code: 'INVALID',
        first_name: 'John',
        last_name: 'Doe',
      };

      const result = PatientDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should sanitize string inputs', () => {
      const dataWithHtml = {
        patient_code: 'P001',
        first_name: 'John<script>alert("xss")</script>',
        last_name: 'Doe',
      };

      const result = PatientDataSchema.safeParse(dataWithHtml);
      if (result.success) {
        expect(result.data.first_name).not.toContain('<script>');
      }
    });
  });

  describe('MedicalAIInputSchema', () => {
    it('should validate medical AI input', () => {
      const validData = {
        patient_id: '123e4567-e89b-12d3-a456-426614174000',
        analysis_type: 'comprehensive' as const,
        vital_signs: {
          blood_pressure: '120/80',
          heart_rate: 72,
          temperature: 36.5,
          spo2: 98,
        },
      };

      const result = MedicalAIInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid vital signs', () => {
      const invalidData = {
        patient_id: '123e4567-e89b-12d3-a456-426614174000',
        analysis_type: 'comprehensive',
        vital_signs: {
          blood_pressure: 'invalid',
          heart_rate: 300, // Too high
        },
      };

      const result = MedicalAIInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('MaterialDataSchema', () => {
    it('should validate material data', () => {
      const validData = {
        material_name: 'Titanium Powder',
        material_code: 'TIT001',
        current_stock: 100,
        minimum_threshold: 20,
        unit_cost: 45.5,
        supplier: 'DentalTech Supplies',
        lead_time_days: 7,
      };

      const result = MaterialDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject negative stock values', () => {
      const invalidData = {
        material_name: 'Titanium Powder',
        material_code: 'TIT001',
        current_stock: -10,
        minimum_threshold: 20,
        unit_cost: 45.5,
        supplier: 'DentalTech Supplies',
        lead_time_days: 7,
      };

      const result = MaterialDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('validateJSON', () => {
    it('should validate and parse valid JSON', () => {
      const jsonString = '{"patient_code":"P001","first_name":"John","last_name":"Doe"}';
      const result = validateJSON(jsonString, PatientDataSchema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.patient_code).toBe('P001');
      }
    });

    it('should handle invalid JSON syntax', () => {
      const invalidJson = '{invalid json}';
      const result = validateJSON(invalidJson, PatientDataSchema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid JSON');
      }
    });

    it('should handle validation errors', () => {
      const jsonString = '{"patient_code":"INVALID","first_name":"John"}';
      const result = validateJSON(jsonString, PatientDataSchema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Validation failed');
      }
    });
  });

  describe('validateFormInput', () => {
    it('should validate form input and return data', () => {
      const formData = {
        patient_code: 'P001',
        first_name: 'John',
        last_name: 'Doe',
      };

      const result = validateFormInput(formData, PatientDataSchema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.patient_code).toBe('P001');
      }
    });

    it('should return field-specific errors', () => {
      const invalidFormData = {
        patient_code: 'INVALID',
        first_name: '',
        last_name: 'Doe',
      };

      const result = validateFormInput(invalidFormData, PatientDataSchema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
        expect(Object.keys(result.errors).length).toBeGreaterThan(0);
      }
    });
  });
});
