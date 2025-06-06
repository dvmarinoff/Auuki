import { equals, } from '../functions.js';

import {
    HeaderType, RecordType,
    getView, setView,
    ValueParser, identityParser,
    type,
} from './common.js';

import { profiles } from './profiles/profiles.js';
import { recordHeader } from './record-header.js';
import { fieldDefinition } from './field-definition.js';

function DataRecord(args = {}) {
    const architecture     = args.architecture ?? true;
    const _type            = RecordType.data;
    const recordHeaderSize = recordHeader.size;

    // {
    //     type: RecordType
    //     architecture: Int,
    //     name: String,
    //     local_number: Int,
    //     length: Int,
    //     data_record_length: Int,
    //     fields: [{number: Int, size: Int, base_type: BaseType}]
    // },
    // {fields: {field_name: Any}} | {field_name: Any},
    // DataView,
    // Int
    // ->
    // DataView
    function encode(definition, data, view, start = 0) {
        const architecture = definition.architecture ?? 0;
        const endian       = !architecture; // arch wierdness?

        if(!('fields' in data)) data = {fields: data};

        const header = recordHeader.encode({
            messageType:      _type,
            localMessageType: definition.local_number,
        });

        view.setUint8(start, header, true);

        return definition.fields.reduce(function(acc, field) {
            const _field = profiles.numberToField(definition.name, field.number);
            const value  = data.fields[_field.name];
            const size = field.size;
            const base_type_size = profiles.baseTypeToSize(field.base_type);

            if(type.string.isString(field.base_type)) {
                // string
                type.string.encode(field, value, view, acc.i, endian);
            } else if(size > base_type_size) {
                // array
                for(let j = 0, k = 0; j < size; j+=base_type_size, k+=1) {
                    type.number.encode(_field, value[k], view, acc.i+j, endian, value % 0xFF === 0);
                }
            } else if(type.timestamp.isTimestamp(_field.type)) {
                // timestamp
                type.timestamp.encode(field, value, view, acc.i, endian);
            } else {
                // number
                type.number.encode(_field, value, view, acc.i, endian);
            }

            acc.i += field.size;
            return acc;
        }, {view, i: (start + recordHeaderSize)}).view;
    }

    // {
    //     type: RecordType
    //     architecture: Int,
    //     name: String,
    //     local_number: Int,
    //     length: Int,
    //     data_record_length: Int,
    //     fields: [{number: Int, size: Int, base_type: base_type}]
    // }
    // DataView,
    // Int
    // ->
    // {
    //     type: RecordType,
    //     name: String,
    //     local_number: Int,
    //     length: Int,
    //     fields: {field_name: Any,}
    // }
    function decode(definition, view, start = 0) {
        const header       = recordHeader.decode(view.getUint8(start, true));
        const local_number = header.localMessageType;
        const name         = definition.name;
        const architecture = definition.architecture;
        const endian       = !architecture;
        const length       = definition.data_record_length;

        return {
            type: _type,
            name,
            local_number,
            length,
            fields: definition.fields.reduce(function(acc, field) {
                const _field = profiles.numberToField(
                    definition.name, field.number
                );
                const size = field.size;
                const base_type_size = profiles.baseTypeToSize(field.base_type);

                let value;

                if(type.string.isString(field.base_type)) {
                    // string
                    value = type.string.decode(field, view, acc.i, endian);
                } else if(size > base_type_size) {
                    // array
                    value = [];
                    for(let j = 0; j < size; j+=base_type_size) {
                        const v = type.number.decode(_field, view, acc.i+j, endian);
                        value.push(v);
                    }
                } else if(type.timestamp.isTimestamp(_field.type)) {
                    // timestamp
                    value = type.timestamp.decode(field, view, acc.i, endian);
                } else {
                    // number
                    value = type.number.decode(_field, view, acc.i, endian);
                }

                acc.fields[_field.name] = value;
                acc.i += field.size;
                return acc;
            }, {fields: {}, i: (start + recordHeaderSize)}).fields,
        };
    }

    function toFITjs(definition, values) {
        // if(!equals(definition.length, values.length)) {
        //     const msg = `DataRecord.toFITjs called with missing values for message: '${definition.name}'`;
        //     console.warn(`fit: error: '${msg}'`, values, definition.fields);
        // }

        return {
            type: _type,
            name: definition.name,
            local_number: definition.local_number,
            length: definition.data_record_length,
            fields: values,
        };
    }

    return Object.freeze({
        type: _type,
        decode,
        encode,
        toFITjs,
    });
}

const dataRecord = DataRecord();

export {
    DataRecord,
    dataRecord,
};

