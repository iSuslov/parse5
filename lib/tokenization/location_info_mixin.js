'use strict';

exports.assign = function (tokenizer) {
    var tokenizerProto = Object.getPrototypeOf(tokenizer);

    tokenizer.tokenStartLoc = -1;
    tokenizer.lastProvidedToken = null;

    //NOTE: patch getNextToken, so we will be able to obtain last provided token in parser
    tokenizer.getNextToken = function () {
        this.lastProvidedToken = tokenizerProto.getNextToken.call(this);

        return this.lastProvidedToken;
    };

    //NOTE: add location info builder method
    tokenizer._attachLocationInfo = function (token) {
        token.location = {
            start: this.tokenStartLoc,
            end: -1
        };
    };

    //NOTE: patch token creation methods and attach location objects
    tokenizer._createStartTagToken = function (tagNameFirstCh) {
        tokenizerProto._createStartTagToken.call(this, tagNameFirstCh);
        this._attachLocationInfo(this.currentToken);
    };

    tokenizer._createEndTagToken = function (tagNameFirstCh) {
        tokenizerProto._createEndTagToken.call(this, tagNameFirstCh);
        this._attachLocationInfo(this.currentToken);
    };

    tokenizer._createCommentToken = function () {
        tokenizerProto._createCommentToken.call(this);
        this._attachLocationInfo(this.currentToken);
    };

    tokenizer._createDoctypeToken = function (doctypeNameFirstCh) {
        tokenizerProto._createDoctypeToken.call(this, doctypeNameFirstCh);
        this._attachLocationInfo(this.currentToken);
    };

    tokenizer._createCharacterToken = function (type, ch) {
        tokenizerProto._createCharacterToken.call(this, type, ch);
        this._attachLocationInfo(this.currentCharacterToken);
    };

    //NOTE: patch token emission methods to determine end location
    tokenizer._emitCurrentToken = function () {
        //NOTE: if we have pending character tokenmake it's end location equal to the
        //current token's start location.
        if (this.currentCharacterToken)
            this.currentCharacterToken.location.end = this.currentToken.location.start;

        this.currentToken.location.end = this.preprocessor.pos + 1;
        tokenizerProto._emitCurrentToken.call(this);
    };

    tokenizer._emitCurrentCharacterToken = function () {
        //NOTE: if we have character token and it's location wasn't set in the _emitCurrentToken(),
        //then set it's location at the current preprocessor position
        if (this.currentCharacterToken && this.currentCharacterToken.location.end === -1) {
            //NOTE: we don't need to increment preprocessor position here, since character token
            //emission here is always forced by the start of the next token character token.
            //So, we already have advanced position here.
            this.currentCharacterToken.location.end = this.preprocessor.pos;
        }

        tokenizerProto._emitCurrentCharacterToken.call(this);
    };

    //NOTE: patch initial states for each mode to obtain token start position
    Object.keys(tokenizerProto.MODE)

        .map(function (modeName) {
            return tokenizerProto.MODE[modeName];
        })

        .forEach(function (state) {
            tokenizer[state] = function (cp) {
                this.tokenStartLoc = this.preprocessor.pos;
                tokenizerProto[state].call(this, cp);
            };
        });
};