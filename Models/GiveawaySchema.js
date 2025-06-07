import { model, Schema, SchemaTypes } from "mongoose";

export default model(
    'Giveaway',
    new Schema(
        {
            guildId: { type: SchemaTypes.String, required: true },
            createdUserId: { type: SchemaTypes.String, required: true },
            channelId: { type: SchemaTypes.String, required: true },
            messageId: { type: SchemaTypes.String, required: true },
            prize: { type: SchemaTypes.String, required: true },
            duration: { type: SchemaTypes.String, required: true },
            winners: { type: SchemaTypes.Number, required: true },
            voice: { type: SchemaTypes.Boolean, required: true },
            createdAt: { type: SchemaTypes.Number, required: true },
            ended : { type: SchemaTypes.Boolean, default: false },
            members: { type: SchemaTypes.Array, default: [] },
        }
    ),
    'giveaway'
)