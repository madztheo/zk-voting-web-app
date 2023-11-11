/*import {
  PublicKey,
  Field,
  MerkleMap,
  UInt32,
  Poseidon,
  PrivateKey,
} from 'o1js';
import { MerkleMapExtended, Vote, VoterData } from './lib';

function Voting({
  proposalTitle,
  proposalId,
  feePayer,
  electionPeriod,
  challengingPeriod,
  voterData,
}: {
  proposalTitle: string;
  proposalId: string;
  feePayer: PrivateKey;
  electionPeriod: {
    start: UInt32;
    end: UInt32;
  };
  challengingPeriod: {
    start: UInt32;
    end: UInt32;
  };
  voterData: { publicKey: PublicKey; weight: Field }[];
}) {
  let acceptingVotes = true;

  const VoterDataTree = MerkleMapExtended<VoterData>();

  // pretty naive but will do for now
  voterData.forEach((voter) => {
    // voters are indexed by the hash of their public key
    VoterDataTree.set(
      Poseidon.hash(voter.publicKey.toFields()),
      new VoterData(voter)
    );
  });

  const NullifierTree = new MerkleMap();

  // this will serve as our mem pool, as we don't have to aggregate all votes directly
  const VotePool: Vote[] = [];

  return {
    async deploy() {},
    async listen() {
      const app = express();
      app.use(express.json());

      app.post('/castVote', (req, res) => {
        if (!acceptingVotes) {
          res.status(400).json({
            reason: 'Voting period is over - not accepting more votes.',
          });
        }
        console.debug('received a vote');
        let jsonVote = req.body;
        if (validateJSONVote(jsonVote)) {
          let isValidOrError = validateVote(jsonVote, VotePool, voterData);
          if (typeof isValidOrError === 'undefined') {
            res.status(200).send();
          } else {
            res.status(400).json({
              reason: isValidOrError as string,
              data: jsonVote,
            });
          }
        } else {
          res.status(400).json({
            reason: 'Invalid vote structure.',
            data: jsonVote,
          });
        }
      });

      app.post('/proposal', (req, res) => {
        res.status(200).json({
          proposalTitle,
          proposalId,
        });
      });

      app.post('/tree', (req, res) => {
        res.status(200).json(VoterDataTree.flat());
      });

      // this triggers tallying but just for now
      app.post('tally', (req, res) => {
        acceptingVotes = false;
        // TODO
      });

      app.listen(PORT, () => {
        console.log(
          `[server]: Vote sequencer running at http://localhost:${PORT}`
        );
      });
    },
  };
}*/
