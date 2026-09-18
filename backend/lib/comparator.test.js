const { compareIR } = require('./comparator');

const ir1 = {
    functions: [
        {
            name: "binarySearch1",
            body: [
                { type: "assign", target: "low", value: "0" },
                { type: "assign", target: "high", value: "len(arr) - 1" },
                {
                    type: "loop",
                    kind: "while",
                    condition: "low <= high",
                    body: [
                        { type: "assign", target: "mid", value: "(low + high) // 2" },
                        {
                            type: "condition",
                            expr: "arr[mid] == target",
                            then: [{ type: "return", value: "mid" }],
                            else: [
                                {
                                    type: "condition",
                                    expr: "arr[mid] < target",
                                    then: [{ type: "assign", target: "low", value: "mid + 1" }],
                                    else: [{ type: "assign", target: "high", value: "mid - 1" }]
                                }
                            ]
                        }
                    ]
                },
                { type: "return", value: "-1" }
            ]
        }
    ]
};

const ir2 = {
    functions: [
        {
            name: "binSearch2",
            body: [
                { type: "assign", target: "left", value: "0" },
                { type: "assign", target: "right", value: "len(data) - 1" },
                {
                    type: "loop",
                    kind: "while",
                    condition: "left <= right",
                    body: [
                        { type: "assign", target: "m", value: "(left + right) // 2" },
                        {
                            type: "condition",
                            expr: "data[m] == t",
                            then: [{ type: "return", value: "m" }],
                            else: [
                                {
                                    type: "condition",
                                    expr: "data[m] < t",
                                    then: [{ type: "assign", target: "left", value: "m + 1" }],
                                    else: [{ type: "assign", target: "right", value: "m - 1" }]
                                }
                            ]
                        }
                    ]
                },
                { type: "return", value: "-1" }
            ]
        }
    ]
};

console.log("Running compareIR on IR1 and IR2...");
const result = compareIR(ir1, ir2);
console.log("Score:", result.similarityScore);
console.log("Evidence:");
result.evidence.forEach(e => console.log("  - " + e));

if (result.similarityScore > 85) {
    console.log("Test passed: Score > 85%");
    process.exit(0);
} else {
    console.error("Test failed: Score is not > 85%");
    process.exit(1);
}
