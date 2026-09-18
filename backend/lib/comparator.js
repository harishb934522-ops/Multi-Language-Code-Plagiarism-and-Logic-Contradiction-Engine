function extractOperators(expr) {
    if (typeof expr !== 'string') return new Set();
    const matches = expr.match(/(>=|<=|==|!=|>|<)/g) || [];
    return new Set(matches);
}

function setsEqual(a, b) {
    if (a.size !== b.size) return false;
    for (const item of a) {
        if (!b.has(item)) return false;
    }
    return true;
}

function compareNodes(n1, n2, evidence) {
    let scoreDeduction = 0;
    
    if (n1.type !== n2.type) {
        evidence.push(`Different node type: ${n1.type} vs ${n2.type}`);
        return 10;
    }
    
    if (n1.type === "loop") {
        if (n1.kind !== n2.kind) {
            evidence.push(`Different loop kind: ${n1.kind} vs ${n2.kind}`);
            scoreDeduction += 5;
        } else {
            evidence.push(`Same loop structure (${n1.kind}-loop)`);
        }
        
        const ops1 = extractOperators(n1.condition || "");
        const ops2 = extractOperators(n2.condition || "");
        if (!setsEqual(ops1, ops2)) {
            evidence.push(`Different comparison operator in loop: ${Array.from(ops1)} vs ${Array.from(ops2)}`);
            scoreDeduction += 2;
        }
        
        scoreDeduction += compareBodies(n1.body || [], n2.body || [], evidence);
        
    } else if (n1.type === "condition") {
        const ops1 = extractOperators(n1.expr || "");
        const ops2 = extractOperators(n2.expr || "");
        if (setsEqual(ops1, ops2) && ops1.size > 0) {
            evidence.push(`Same condition operators: ${Array.from(ops1)}`);
        } else if (!setsEqual(ops1, ops2)) {
            evidence.push(`Different comparison operator in condition: ${Array.from(ops1)} vs ${Array.from(ops2)}`);
            scoreDeduction += 2;
        }
        
        scoreDeduction += compareBodies(n1.then || [], n2.then || [], evidence);
        scoreDeduction += compareBodies(n1.else || [], n2.else || [], evidence);
        
    } else if (n1.type === "assign") {
        if (n1.target !== n2.target) {
            evidence.push(`Variable names differ but structure is identical (${n1.target} vs ${n2.target})`);
        }
    } else if (n1.type === "call") {
        if (n1.name !== n2.name) {
            evidence.push(`Function calls differ: ${n1.name} vs ${n2.name}`);
        }
    }
    
    return scoreDeduction;
}

function compareBodies(body1, body2, evidence) {
    let deductions = 0;
    const maxLen = Math.max(body1.length, body2.length);
    const minLen = Math.min(body1.length, body2.length);
    
    if (maxLen > minLen) {
        deductions += (maxLen - minLen) * 5;
        evidence.push(`Different block lengths (${body1.length} vs ${body2.length})`);
    }
    
    for (let i = 0; i < minLen; i++) {
        deductions += compareNodes(body1[i], body2[i], evidence);
    }
    
    return deductions;
}

function compareIR(ir1, ir2) {
    const funcs1 = ir1.functions || [];
    const funcs2 = ir2.functions || [];
    
    const evidence = [];
    let score = 100;
    
    const maxF = Math.max(funcs1.length, funcs2.length);
    const minF = Math.min(funcs1.length, funcs2.length);
    
    if (maxF > minF) {
        score -= (maxF - minF) * 10;
        evidence.push(`Different number of functions (${funcs1.length} vs ${funcs2.length})`);
    }
    
    for (let i = 0; i < minF; i++) {
        const deductions = compareBodies(funcs1[i].body || [], funcs2[i].body || [], evidence);
        score -= deductions;
    }
    
    score = Math.max(0, score);
    return { similarityScore: score, evidence };
}

module.exports = {
    compareIR
};
