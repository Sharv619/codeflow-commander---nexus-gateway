export var StageStatus;
(function (StageStatus) {
    StageStatus["Pending"] = "PENDING";
    StageStatus["Running"] = "RUNNING";
    StageStatus["Success"] = "SUCCESS";
    StageStatus["Failed"] = "FAILED";
    StageStatus["Skipped"] = "SKIPPED";
})(StageStatus || (StageStatus = {}));
export var SimulationMode;
(function (SimulationMode) {
    SimulationMode["Realistic"] = "REALISTIC";
    SimulationMode["Fast"] = "FAST";
    SimulationMode["Deterministic"] = "DETERMINISTIC";
    SimulationMode["Chaotic"] = "CHAOTIC";
})(SimulationMode || (SimulationMode = {}));
