import { test, expect } from '@playwright/test';
import { buildEspdJson, buildEspdXml, buildEspdWithXml, validateEspdRequest, buildEspdWithDefaults } from '../../src/lib/espd/builder';
import { buildEForms, buildF02Notice, buildF03Notice, buildF14Notice, validateEFormsNotice, createLot, createLots } from '../../src/lib/eforms/builder';

test.describe('ESPD Builder', () => {
  test('buildEspdJson validates and normalizes', () => {
    const r = buildEspdJson({
      title: 'ESPD X',
      buyer: { name: 'Kommune Y', identifier: '12345678' },
      criteria: [{ type: 'economic', value: 'Omsætning >= 10m DKK' }]
    });
    
    expect(r.preset).toBe('standardDK');
    expect(r.title).toBe('ESPD X');
    expect(r.buyer.name).toBe('Kommune Y');
    expect(r.buyer.identifier).toBe('12345678');
    expect(r.criteria).toHaveLength(1);
    expect(r.criteria[0].type).toBe('economic');
    expect(r.criteria[0].value).toBe('Omsætning >= 10m DKK');
  });

  test('buildEspdJson applies default preset', () => {
    const r = buildEspdJson({
      title: 'Test ESPD',
      buyer: { name: 'Test Org', identifier: '99999999' }
    });
    
    expect(r.preset).toBe('standardDK');
    expect(r.criteria).toEqual([]);
  });

  test('buildEspdXml produces valid XML', () => {
    const r = buildEspdJson({ 
      title: 'Test ESPD',
      buyer: { name: 'Test Buyer', identifier: '9999' },
      criteria: [
        { type: 'economic', value: 'Financial stability' },
        { type: 'technical', value: 'Technical capacity' }
      ]
    });
    
    const xml = buildEspdXml(r);
    
    expect(xml).toContain('<ESPDRequest');
    expect(xml).toContain('xmlns="urn:grow:espd:request:1.0.0"');
    expect(xml).toContain('<Title>Test ESPD</Title>');
    expect(xml).toContain('<Name>Test Buyer</Name>');
    expect(xml).toContain('<Identifier>9999</Identifier>');
    expect(xml).toContain('<Preset>standardDK</Preset>');
    expect(xml).toContain('<Criterion type="economic">');
    expect(xml).toContain('<Value>Financial stability</Value>');
    expect(xml).toContain('<Criterion type="technical">');
    expect(xml).toContain('<Value>Technical capacity</Value>');
  });

  test('buildEspdWithXml includes XML attachment', () => {
    const r = buildEspdWithXml({
      title: 'Test ESPD',
      buyer: { name: 'Test Buyer', identifier: '9999' }
    });
    
    expect(r.title).toBe('Test ESPD');
    expect(r.__xml).toBeDefined();
    expect(r.__xml).toContain('<ESPDRequest');
  });

  test('validateEspdRequest validates correct input', () => {
    const validInput = {
      title: 'Valid ESPD',
      buyer: { name: 'Valid Org', identifier: '12345678' },
      criteria: [{ type: 'economic', value: 'Valid criterion' }]
    };
    
    const result = validateEspdRequest(validInput);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.title).toBe('Valid ESPD');
  });

  test('validateEspdRequest rejects invalid input', () => {
    const invalidInput = {
      title: '', // Empty title should fail
      buyer: { name: 'Valid Org', identifier: '12345678' }
    };
    
    const result = validateEspdRequest(invalidInput);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('buildEspdWithDefaults includes default criteria', () => {
    const r = buildEspdWithDefaults({
      title: 'Default ESPD',
      buyer: { name: 'Test Org', identifier: '12345678' },
      preset: 'standardDK'
    });
    
    expect(r.preset).toBe('standardDK');
    expect(r.criteria.length).toBeGreaterThan(0);
    expect(r.criteria.some(c => c.type === 'economic')).toBe(true);
    expect(r.criteria.some(c => c.type === 'technical')).toBe(true);
    expect(r.criteria.some(c => c.type === 'experience')).toBe(true);
  });

  test('buildEspdWithDefaults includes additional criteria', () => {
    const r = buildEspdWithDefaults({
      title: 'Default ESPD',
      buyer: { name: 'Test Org', identifier: '12345678' },
      additionalCriteria: [
        { type: 'other', value: 'Custom criterion' }
      ]
    });
    
    expect(r.criteria.length).toBeGreaterThan(3); // Default + additional
    expect(r.criteria.some(c => c.value === 'Custom criterion')).toBe(true);
  });
});

test.describe('eForms Builder', () => {
  test('buildEForms validates minimal open tender', () => {
    const n = buildEForms({
      noticeType: 'F02',
      title: 'Road works',
      cpv: ['45233120'],
      buyer: { name: 'City', identifier: '1234', country: 'DK' },
      procedure: { type: 'open' },
      lots: [{ id: 'LOT-1' }]
    });
    
    expect(n.procedure.type).toBe('open');
    expect(n.noticeType).toBe('F02');
    expect(n.title).toBe('Road works');
    expect(n.cpv).toEqual(['45233120']);
    expect(n.buyer.country).toBe('DK');
    expect(n.accessIsFree).toBe(true);
    expect(n.communication).toBe('platform');
  });

  test('buildEForms applies defaults', () => {
    const n = buildEForms({
      noticeType: 'F02',
      title: 'Test Notice',
      cpv: ['12300000'],
      buyer: { name: 'Test Org', identifier: '1234' },
      procedure: { type: 'open' },
      lots: [{ id: 'LOT-1' }]
    });
    
    expect(n.buyer.country).toBe('DK');
    expect(n.accessIsFree).toBe(true);
    expect(n.communication).toBe('platform');
  });

  test('buildF02Notice creates contract notice', () => {
    const n = buildF02Notice({
      title: 'IT Services',
      cpv: ['12300000'],
      buyer: { name: 'Municipality', identifier: '12345678' },
      procedure: 'open',
      lots: [{ id: 'LOT-1', title: 'IT Support' }],
      deadlines: { tender: '2025-01-15T12:00' }
    });
    
    expect(n.noticeType).toBe('F02');
    expect(n.procedure.type).toBe('open');
    expect(n.lots[0].title).toBe('IT Support');
    expect(n.deadlines?.tender).toBe('2025-01-15T12:00');
  });

  test('buildF03Notice creates award notice', () => {
    const n = buildF03Notice({
      title: 'IT Services Award',
      cpv: ['12300000'],
      buyer: { name: 'Municipality', identifier: '12345678' },
      winnerName: 'Best IT A/S',
      contractValue: 1000000,
      lots: [{ id: 'LOT-1', title: 'IT Support' }]
    });
    
    expect(n.noticeType).toBe('F03');
    expect(n.description).toContain('Contract award notice');
  });

  test('buildF14Notice creates qualification system', () => {
    const n = buildF14Notice({
      title: 'IT Framework',
      cpv: ['12300000'],
      buyer: { name: 'Municipality', identifier: '12345678' },
      categories: ['IT Services', 'Software'],
      lots: [{ id: 'LOT-1', title: 'Framework' }]
    });
    
    expect(n.noticeType).toBe('F14');
    expect(n.procedure.type).toBe('qualification');
    expect(n.description).toContain('Qualification system');
  });

  test('validateEFormsNotice validates correct input', () => {
    const validInput = {
      noticeType: 'F02',
      title: 'Valid Notice',
      cpv: ['12300000'],
      buyer: { name: 'Valid Org', identifier: '1234' },
      procedure: { type: 'open' },
      lots: [{ id: 'LOT-1' }]
    };
    
    const result = validateEFormsNotice(validInput);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.title).toBe('Valid Notice');
  });

  test('validateEFormsNotice rejects invalid CPV', () => {
    const invalidInput = {
      noticeType: 'F02',
      title: 'Invalid Notice',
      cpv: ['invalid-cpv'], // Invalid CPV format
      buyer: { name: 'Valid Org', identifier: '1234' },
      procedure: { type: 'open' },
      lots: [{ id: 'LOT-1' }]
    };
    
    const result = validateEFormsNotice(invalidInput);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('createLot creates lot with defaults', () => {
    const lot = createLot({
      id: 'LOT-1',
      valueEstimate: 500000
    });
    
    expect(lot.id).toBe('LOT-1');
    expect(lot.title).toBe('Lot LOT-1');
    expect(lot.valueEstimate).toBe(500000);
  });

  test('createLots creates multiple lots', () => {
    const lots = createLots({
      count: 3,
      baseTitle: 'IT Services',
      valueEstimate: 1000000
    });
    
    expect(lots).toHaveLength(3);
    expect(lots[0].id).toBe('LOT-1');
    expect(lots[0].title).toBe('IT Services - Lot 1');
    expect(lots[1].id).toBe('LOT-2');
    expect(lots[2].id).toBe('LOT-3');
    expect(lots[0].valueEstimate).toBe(1000000);
  });
});
