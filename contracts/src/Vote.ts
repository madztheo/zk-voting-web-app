import {
  Field,
  SmartContract,
  state,
  State,
  method,
  ZkProgram,
  Struct,
  UInt32,
  Provable,
  Circuit,
} from 'o1js';

const VoteProgram = ZkProgram({
  name: 'vote-program',
  publicInput: Field,
  methods: {
    run: {
      privateInputs: [],
      method(publicInput: Field) {
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

  static cast(prevBallot: Ballot, candidate: UInt32) {
    for (let i = 0; i < prevBallot.candidates.length; i++) {
      prevBallot.candidates[i] = prevBallot.candidates[i].add(
        Provable.if(
          UInt32.from(i).equals(candidate),
          UInt32.from(1),
          UInt32.from(0)
        )
      );
    }
    return prevBallot;
  }
}

export class Vote extends SmartContract {
  @state(Ballot) ballot = State<Ballot>();

  init() {
    super.init();
    this.ballot.set(Ballot.create());
  }

  @method cast(candidate: UInt32) {
    // Note: race conditions can make this fail
    const currentBallot = this.ballot.getAndAssertEquals();
    const newBallot = Ballot.cast(currentBallot, candidate);
    this.ballot.set(newBallot);
  }

  @method resetElection() {
    this.ballot.set(Ballot.create());
  }
}
