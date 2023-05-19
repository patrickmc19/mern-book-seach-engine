const { User, Book } = require('../models');

const { AuthenticationError } = require('apollo-server-express');
const { signToken } = require('../utils/auth');

const resolvers = {
    // Query will retrieve the logged in user's information (user) and populate the savedBooks and bookCount fields.
    Query: {
        me: async (parent, args, context) => {
            if(context.user) {
                const userData = await User.findOne({ _id: context.user._id })
                    .select('-__v -password')
                    .populate('books');

                return userData;
            }

            throw new AuthenticationError('Not logged in');
        },
    },
    Mutation: {
        // login will receive an email and password as parameters. When the user attempts to log in with this mutation, we'll verify that the user exists and that the correct password was provided. If the user is verified, we'll create a token with the user data and return it to the client.
        login: async (parent, { email, password }) => {
            const user = await User.findOne({ email });

            if(!user) {
                throw new AuthenticationError('Invalid credentials');
            }

            const validPw = await user.isCorrectPassword(password);

            if(!validPw) {
                throw new AuthenticationError('Invalid credentials');
            }

            const token = signToken(user);
            return { token, user };
        },

        // addUser will receive data from the front end as an argument that we're defining as input. This input will be used to create a new user, and then we'll return an object that contains the token and user properties.
        addUser: async (parent, args) => {
            const user = await User.create(args);
            const token = signToken(user);

            return { token, user };
        },

        // removeBook will receive a bookId as an argument and find and delete the book with the id. It will then return the updated user with the book removed from the savedBooks array.
        removeBook: async (parent, { bookId }, context) => {
            if (context.user) {
                const removedBook = await User.findOneAndUpdate(
                    { _id: context.user._id },
                    { $pull: { savedBooks: { bookId } } },
                    { new: true }
                );

                return removedBook;
            }
        },
        
        // saveBook will receive data from the front end as an argument that we're defining as input. This input will be used to create a new book to add to a user's list of saved books and return a user object.
        saveBook: async (parent, { newBook }, context) => {
            if (context.user) {
                const updatedBooks = await User.findOneAndUdate(
                    { _id: context.user._id },
                    { $addToSet: { savedBooks: newBook } },
                    { new: true }
                ).populate('savedBooks');

                return updatedBooks;
            }

            throw new AuthenticationError('Please login!');
        }
    }
};

// export the resolvers
module.exports = resolvers;