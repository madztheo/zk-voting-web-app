import {
  MerkleMap,
  MerkleMapWitness,
  Poseidon,
  Field,
  ZkProgram,
  Provable,
  SelfProof,
} from 'o1js';

import {
  MerkleMapExtended,
  Nullifier,
  StateTransition,
  Vote,
  calculateVotes,
} from './lib.js';

export function Prover(
  nullifierTree: MerkleMap,
  voterData: ReturnType<typeof MerkleMapExtended>
) {
  const voteAggregator = ZkProgram({
    name: 'VoteAggregator',
    publicInput: StateTransition,
    methods: {
      baseCase: {
        privateInputs: [Provable.Array(Vote, 3)],
        method(publicInput: StateTransition, votes: Vote[]) {
          processStateTransition(nullifierTree, voterData, publicInput, votes);
        },
      },
      next: {
        privateInputs: [SelfProof, Provable.Array(Vote, 3)],
        method(
          publicInput: StateTransition,
          earlierProof: SelfProof<StateTransition, void>,
          votes: Vote[]
        ) {
          // Check the details of the previous proof matches the current state
          earlierProof.publicInput.nullifier.after.assertEquals(
            publicInput.nullifier.before
          );
          earlierProof.publicInput.result.after.candidates.map((v, i) =>
            v.assertEquals(publicInput.result.before.candidates[i])
          );
          earlierProof.publicInput.electionId.assertEquals(
            publicInput.electionId
          );
          earlierProof.publicInput.voterDataRoot.assertEquals(
            publicInput.voterDataRoot
          );

          // Verify the previous proof itself
          earlierProof.verify();

          processStateTransition(nullifierTree, voterData, publicInput, votes);
        },
      },
    },
  });

  return voteAggregator;
}

function processStateTransition(
  nullifierTree: MerkleMap,
  voterData: ReturnType<typeof MerkleMapExtended>,
  publicInput: StateTransition,
  votes: Vote[]
) {
  // because we batch votes, we have to transition our nullifier root
  // from n_v1 -> n_v2 -> n_v3, thats why we store it temporary
  let tempRoot = publicInput.nullifier.before;

  // we accumulate the results of our three votes - obviously we start with 0
  let candidatesCount: Field[] = Array(4).fill(Field(0));

  // we go through each vote
  for (let i = 0; i < 3; i++) {
    let vote = votes[i];
    // verifying signature, obviously!
    vote.verifySignature(vote.voter).assertTrue();

    // we check if the voter is actually part of the list of eligible voters that we defined at the beginning
    checkVoterEligibility(vote, voterData, publicInput).assertTrue(
      'Voter is not an eligible voter!'
    );

    // making sure the voter actually voted for this proposal, preventing replay attacks
    publicInput.electionId.assertEquals(
      vote.electionId,
      'Vote electionId does not match actual electionId!'
    );

    // check that no nullifier has been set already - if all is good, set the nullifier!
    tempRoot = checkAndSetNullifier(vote, nullifierTree, tempRoot);

    /*let voteCandidateId = vote.candidate.id;
            voteCandidateId.assertNotEquals(Field(0));*/
  }

  // we aggregate the results for this single vote
  candidatesCount = calculateVotes(votes);

  // we add results that we got to the ones that we started with - sum'ing them up to the final result
  // we constraint the votes to the final result
  for (let i = 0; i < candidatesCount.length; i++) {
    publicInput.result.after.candidates[i].assertEquals(
      candidatesCount[i].add(publicInput.result.before.candidates[i])
    );
  }

  // we make sure that the final nullifier root is valid
  tempRoot.assertEquals(
    publicInput.nullifier.after,
    'Invalid state transition!'
  );
}

function checkAndSetNullifier(
  vote: Vote,
  nullifierTree: MerkleMap,
  nullifierRoot: Field
) {
  let expectedNullifier = Nullifier(vote.voter, vote.electionId);

  let nullifierWitness = Provable.witness(MerkleMapWitness, () => {
    return nullifierTree.getWitness(expectedNullifier);
  });

  let [root] = nullifierWitness.computeRootAndKey(Field(0));

  // we expect that a 0 is set as position [expectedNullifier] (voter key and proposal id), so if it matches it means the nullifier hasn't been set yet
  root.assertEquals(nullifierRoot, 'Nullifier already set!');

  // set the nullifier to 1
  let [newRoot] = nullifierWitness.computeRootAndKey(Field(1));

  Provable.asProver(() => {
    nullifierTree.set(expectedNullifier, Field(1));
  });

  return newRoot;
}

function checkVoterEligibility(
  vote: Vote,
  voterData: ReturnType<typeof MerkleMapExtended>,
  publicInput: StateTransition
) {
  let membershipProof = Provable.witness(MerkleMapWitness, () => {
    return voterData.getWitness(Poseidon.hash(vote.voter.toFields()));
  });
  let [root] = membershipProof.computeRootAndKey(
    Poseidon.hash(vote.voter.toFields())
  );
  return root.equals(publicInput.voterDataRoot);
}
