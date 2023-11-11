var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Field, SmartContract, state, State, method, ZkProgram, Struct, UInt32, Provable, } from 'o1js';
const VoteProgram = ZkProgram({
    name: 'vote-program',
    publicInput: Field,
    methods: {
        run: {
            privateInputs: [],
            method(publicInput) {
                publicInput.assertEquals(Field(0));
            },
        },
    },
});
class Ballot extends Struct({
    candidates: [UInt32, UInt32, UInt32, UInt32, UInt32, UInt32, UInt32, UInt32],
}) {
    static create() {
        return new Ballot({
            candidates: [
                UInt32.from(0),
                UInt32.from(0),
                UInt32.from(0),
                UInt32.from(0),
                UInt32.from(0),
                UInt32.from(0),
                UInt32.from(0),
                UInt32.from(0),
            ],
        });
    }
    static cast(prevBallot, candidate) {
        for (let i = 0; i < prevBallot.candidates.length; i++) {
            prevBallot.candidates[i] = prevBallot.candidates[i].add(Provable.if(UInt32.from(i).equals(candidate), UInt32.from(1), UInt32.from(0)));
        }
        return prevBallot;
    }
}
export class Vote extends SmartContract {
    constructor() {
        super(...arguments);
        this.ballot = State();
    }
    init() {
        super.init();
        this.ballot.set(Ballot.create());
    }
    cast(candidate) {
        // Note: race conditions can make this fail
        const currentBallot = this.ballot.getAndAssertEquals();
        const newBallot = Ballot.cast(currentBallot, candidate);
        this.ballot.set(newBallot);
    }
    resetElection() {
        this.ballot.set(Ballot.create());
    }
}
__decorate([
    state(Ballot),
    __metadata("design:type", Object)
], Vote.prototype, "ballot", void 0);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UInt32]),
    __metadata("design:returntype", void 0)
], Vote.prototype, "cast", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Vote.prototype, "resetElection", null);
//# sourceMappingURL=CompleteVote.js.map