const fs = require('fs');
let code = fs.readFileSync('src/app.ts', 'utf8');

code = code.replace(/app\.use\(cors\(\)\);\r?\napp\.use\(express\.json\(\)\);/, `app.use((req, res, next) => {
  const originalJson = res.json;
  (req as any).metrics = { nosqlCalls: 0, cacheHits: 0, cacheMisses: 0, startTime: Date.now() };
  
  res.json = function (body) {
    const totalTime = Date.now() - (req as any).metrics.startTime;
    res.setHeader('x-timing-total', \`\${totalTime}ms\`);
    res.setHeader('x-timing-nosql-calls', \`\${(req as any).metrics.nosqlCalls}\`);
    res.setHeader('x-timing-cache-hits', \`\${(req as any).metrics.cacheHits}\`);
    res.setHeader('x-timing-cache-misses', \`\${(req as any).metrics.cacheMisses}\`);
    
    // Forensic diagnostics
    res.setHeader('x-db-provider-actual', (req.headers['x-mock-db-provider'] || process.env.DB_PROVIDER || 'mongo') as string);
    res.setHeader('x-data-source', (req as any).metrics.nosqlCalls > 0 ? 'nosql' : ((req as any).metrics.cacheHits > 0 ? 'memory-cache' : 'mongo'));
    res.setHeader('x-cache-state', \`hits:\${(req as any).metrics.cacheHits},misses:\${(req as any).metrics.cacheMisses}\`);
    
    return originalJson.call(this, body);
  };
  next();
});

app.use(cors());
app.use(express.json());`);

fs.writeFileSync('src/app.ts', code);
console.log('Interceptor injected.');
