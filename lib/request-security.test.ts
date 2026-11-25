import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { sameOrigin } from './request-security';

describe('sameOrigin',()=>{
  it('accepts a browser request from the current host',()=>{
    const request=new NextRequest('https://teamspirit.example/api/erp',{method:'POST',headers:{host:'teamspirit.example',origin:'https://teamspirit.example'}});
    expect(sameOrigin(request)).toBe(true);
  });
  it('blocks a request from another site',()=>{
    const request=new NextRequest('https://teamspirit.example/api/erp',{method:'POST',headers:{host:'teamspirit.example',origin:'https://attacker.example'}});
    expect(sameOrigin(request)).toBe(false);
  });
});
