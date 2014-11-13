
/**
 * A helper object for paging over Firebase objects.
 * @constructor Fireproof.Pager
 * @static
 * @param {Fireproof} ref a Firebase ref whose children you wish to page over.
 * @param {Number} initialCount The number of objects in the first page.
 */
function Pager(ref, initialCount) {

  if (arguments.length < 2) {
    throw new Error('Not enough arguments to Pager');
  }

  this._mainRef = ref.ref();
  this._resetCurrentOperation();

  var promise = this.next(initialCount);
  this.then = promise.then.bind(promise);

}


/**
 * Get the next page of children from the ref.
 * @method Fireproof.Pager#next
 * @param {Number} count The size of the page.
 * @returns {Promise} A promise that resolves with an array of the next children.
 */
Pager.prototype.next = function(count) {

  if (arguments.length === 0) {
    throw new Error('Not enough arguments to next');
  }

  var self = this;

  return self._currentOperation
  .then(function() {

    self._direction = 'next';

    var ref = self._mainRef;
    if (self._page) {

      ref = ref.startAt(self._page.end.priority, self._page.end.key)
      .limit(count + 1);

    } else {
      ref = ref.startAt().limit(count);
    }

    return ref.once('value');
  })
  .then(self._handleResults.bind(self));

};


/**
 * Get the previous page of children from the ref.
 * @method Fireproof.Pager#previous
 * @param {Number} count The size of the page.
 * @returns {Promise} A promise that resolves with an array of the next children.
 */
Pager.prototype.previous = function(count) {

  if (arguments.length === 0) {
    throw new Error('Not enough arguments to previous');
  }

  var self = this;

  return self._currentOperation
  .then(function() {

    self._direction = 'previous';

    var ref = self._mainRef;
    if (self._page) {

      ref = ref.endAt(self._page.start.priority, self._page.start.key)
      .limit(count + 1);

    } else {
      ref = ref.limit(count);
    }

    return ref.once('value');
  })
  .then(self._handleResults.bind(self));

};


Pager.prototype._handleResults = function(snap) {

  var self = this,
    objects = [];

  var childIndex = 0;
  var childCount = snap.numChildren();

  snap.forEach(function(child) {

    // if this child is the "catch" object, don't include it in the results
    var isCatchObject;
    if (self._direction === 'next') {
      isCatchObject = self._page && childIndex === 0;
    } else {
      isCatchObject = self._page && childIndex === childCount-1;
    }

    if (!isCatchObject) {
      objects.push(child);
    }

    childIndex++;

  });

  if (objects.length > 0) {

    // set page positions
    self._page = {
      start: {
        priority: objects[0].getPriority(),
        key: objects[0].name()
      },

      end: {
        priority: objects[objects.length-1].getPriority(),
        key: objects[objects.length-1].name()
      }
    };

  }

  self._currentOperationCount--;

  if (self._currentOperationCount === 0) {
    self._resetCurrentOperation();
  }

  return objects;

};


Pager.prototype._resetCurrentOperation = function() {

  var deferred = Fireproof._checkQ().defer();
  deferred.resolve(null);
  this._currentOperation = deferred.promise;
  this._currentOperationCount = 0;

};

Fireproof.Pager = Pager;