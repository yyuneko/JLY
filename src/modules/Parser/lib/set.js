class _Set {
    constructor() {
        this.items = [];
    }

    /* add(item) {
         if (item !== null && typeof item !== "undefined")
             if (this.indexOf(item) === -1) this.items.push(item);
     }*/
    add(...items) {
        for (let item of items) {
            if (this.indexOf(item) === -1) this.items.push(item);
        }
    }

    eq(otherSet) {
        if (otherSet instanceof _Set)
            return this.items.length === otherSet.items.length && this.subset(otherSet);
        throw TypeError(`${otherSet} is not instance of _Set`);
    }

    indexOf(item) {
        if (item !== null && typeof item !== "undefined" && item.eq) {
            for (let i = 0; i < this.items.length; ++i) {
                if (item.eq(this.items[i])) return i;
            }
            return -1;
        }
        throw TypeError(`${item} has no function to determine whether two items are equal`)
    }

    subset(otherSet) {
        if (!(otherSet instanceof _Set)) throw TypeError(`${otherSet} is not instance of _Set`);
        for (let item of this.items) {
            if (otherSet.indexOf(item) === -1) return false;
        }
        return true;
    }

    join(separator) {
        return this.items.join(separator);
    }


    get size() {
        return this.items.length;
    }
}

module.exports = _Set;
